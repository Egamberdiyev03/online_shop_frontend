import { Injectable, inject, signal, effect, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  HttpTransportType
} from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { ResponseModel, unwrapResult } from '../models/response.model';
import { NotificationDto, NotificationRequest } from '../models/notification.model';
import { AuthStateService } from './auth-state.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class UserNotificationService implements OnDestroy {
  private http = inject(HttpClient);
  private authState = inject(AuthStateService);
  private toast = inject(NotificationService);
  private router = inject(Router);

  private readonly apiUrl = `${environment.apiUrl}/Notification`;
  private hubConnection: HubConnection | null = null;
  private audioCtx: AudioContext | null = null;
  private fallbackPollTimer: any = null;
  private initialLoaded = false;
  private seenNotificationIds = new Set<number>();

  // Signals - Reaktiv holat
  public notifications = signal<NotificationDto[]>([]);
  public unreadCount = signal<number>(0);
  public isConnected = signal<boolean>(false);
  public isLoading = signal<boolean>(false);
  public activeCurierPopup = signal<NotificationDto | null>(null);
  public lastOrderEventAt = signal<number>(0);

  constructor() {
    this.setupAudioUnlock();

    // Foydalanuvchi tizimga kirganida yoki chiqqanida avtomatik ishga tushadi
    effect(() => {
      const isAuth = this.authState.isAuthenticated();
      const token = this.authState.token();

      if (isAuth && token) {
        this.initialize();
      } else {
        this.cleanup();
      }
    });
  }

  private setupAudioUnlock(): void {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        if (!this.audioCtx) {
          this.audioCtx = new AudioCtx();
        }
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
      } catch {}
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  /**
   * SignalR Hub manzilini to'g'ri hisoblash
   */
  private getHubUrl(): string {
    const api = (environment.apiUrl || '').trim();
    if (api.startsWith('http://') || api.startsWith('https://')) {
      try {
        const url = new URL(api);
        return `${url.origin}/notificationHub`;
      } catch {
        return `${api.replace(/\/api\/?$/, '')}/notificationHub`;
      }
    }
    // Nisbiy yo'l bo'lsa:
    return '/notificationHub';
  }

  /**
   * Bildirishnomalarni va ulanishni ishga tushirish
   */
  public async initialize(): Promise<void> {
    this.initialLoaded = false;
    this.loadUnreadCount();
    this.loadNotifications(1, 15);
    await this.startSignalR();
    this.startCurierFallbackPolling();
  }

  private startCurierFallbackPolling(): void {
    if (this.fallbackPollTimer) {
      clearInterval(this.fallbackPollTimer);
      this.fallbackPollTimer = null;
    }
    if (!this.authState.isCurier()) return;

    this.fallbackPollTimer = setInterval(() => {
      if (this.authState.isAuthenticated() && this.authState.isCurier()) {
        this.loadNotifications(1, 15);
        this.loadUnreadCount();
      }
    }, 20000);
  }

  /**
   * SignalR Hub ga ulanish
   */
  public async startSignalR(): Promise<void> {
    if (this.hubConnection && this.hubConnection.state === HubConnectionState.Connected) {
      return;
    }

    const token = this.authState.token();
    if (!token) return;

    try {
      if (this.hubConnection) {
        await this.hubConnection.stop();
      }

      this.hubConnection = new HubConnectionBuilder()
        .withUrl(this.getHubUrl(), {
          accessTokenFactory: () => this.authState.token() || '',
          transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(LogLevel.Warning)
        .build();

      // Real-time bildirishnoma kelganda
      this.hubConnection.on('ReceiveNotification', (notification: NotificationDto) => {
        this.handleIncomingNotification(notification);
      });

      this.hubConnection.onreconnecting(() => {
        this.isConnected.set(false);
      });

      this.hubConnection.onreconnected(() => {
        this.isConnected.set(true);
        this.loadUnreadCount();
      });

      this.hubConnection.onclose(() => {
        this.isConnected.set(false);
      });

      await this.hubConnection.start();
      this.isConnected.set(true);
    } catch (err) {
      console.warn('SignalR ulanishida xatolik yuz berdi (backend hozircha faol bo\'lmasligi mumkin):', err);
      this.isConnected.set(false);
    }
  }

  /**
   * SignalR ulanishini to'xtatish
   */
  public async stopSignalR(): Promise<void> {
    if (this.hubConnection) {
      try {
        await this.hubConnection.stop();
      } catch (err) {
        console.warn('SignalR to\'xtatishda xatolik:', err);
      } finally {
        this.hubConnection = null;
        this.isConnected.set(false);
      }
    }
  }

  private isCurierAssignmentType(type: any): boolean {
    const t = String(type ?? '');
    return t === 'OrderAssignedToCurier' || t === '18' ||
           t === 'CurierAssigned' || t === '21' ||
           t === 'CourierAssigned' || t === '8';
  }

  private isCurierOrderEventType(type: any): boolean {
    const t = String(type ?? '');
    return this.isCurierAssignmentType(type) ||
           t === 'OrderUnassignedFromCurier' || t === '19' ||
           t === 'OrderCancelledForCurier' || t === '20';
  }

  /**
   * Yangi bildirishnoma kelganda ishlov berish
   */
  private handleIncomingNotification(notification: NotificationDto): void {
    if (notification?.id) {
      if (this.seenNotificationIds.has(notification.id)) {
        return;
      }
      this.seenNotificationIds.add(notification.id);
    }

    // Ro'yxat boshiga qo'shish
    this.notifications.update(list => [notification, ...list]);

    // O'qilmaganlar sonini oshirish
    this.unreadCount.update(c => c + 1);

    if (this.isCurierAssignmentType(notification.type) || (this.authState.isCurier() && !this.isCurierOrderEventType(notification.type) && String(notification.type) !== '23')) {
      this.triggerCurierOrderAlert(notification);
    } else {
      // Oddiy ovozli signal chalish
      this.playChime();
      // Ekranda Toast ko'rinishida xabar chiqarish
      this.toast.info(notification.body, notification.title || 'Yangi bildirishnoma');
    }

    if (this.isCurierOrderEventType(notification.type)) {
      this.lastOrderEventAt.set(Date.now());
    }
  }

  private triggerCurierOrderAlert(notification: NotificationDto): void {
    this.playCurierAlertSound();
    try {
      navigator.vibrate?.([250, 100, 250, 100, 350]);
    } catch {}
    this.activeCurierPopup.set(notification);
    this.lastOrderEventAt.set(Date.now());
  }

  public dismissCurierPopup(): void {
    this.activeCurierPopup.set(null);
  }

  public openCurierPopupOrder(notification: NotificationDto): void {
    this.activeCurierPopup.set(null);
    if (notification.id && !notification.isRead) {
      this.markAsRead(notification.id);
    }
    this.router.navigate(['/curier/deliveries']);
  }

  public testCurierSound(): void {
    this.playCurierAlertSound();
    try {
      navigator.vibrate?.([150, 80, 150]);
    } catch {}
  }

  private getOrCreateAudioContext(): AudioContext | null {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Kuryerga yangi buyurtma tushganda chaladigan aniq va eshitiladigan qo'ng'iroq ovozi
   */
  private playCurierAlertSound(): void {
    try {
      const ctx = this.getOrCreateAudioContext();
      if (!ctx) return;

      const notes = [
        { freq: 659.25, delay: 0, dur: 0.14 },     // E5
        { freq: 880.0, delay: 0.13, dur: 0.14 },   // A5
        { freq: 1046.5, delay: 0.26, dur: 0.24 },  // C6
        { freq: 659.25, delay: 0.58, dur: 0.14 },  // E5 (takror)
        { freq: 880.0, delay: 0.71, dur: 0.14 },   // A5
        { freq: 1046.5, delay: 0.84, dur: 0.32 }   // C6
      ];

      const now = ctx.currentTime;
      for (const n of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.freq, now + n.delay);
        gain.gain.setValueAtTime(0.001, now + n.delay);
        gain.gain.linearRampToValueAtTime(0.28, now + n.delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.delay + n.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + n.delay);
        osc.stop(now + n.delay + n.dur + 0.02);
      }
    } catch {
      // Brauzer audio siyosati bloklasa xato bermaydi
    }
  }

  /**
   * Web Audio API orqali yumshoq va professional ovozli signal
   */
  private playChime(): void {
    try {
      const ctx = this.getOrCreateAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Brauzer siyosati tufayli ovoz bloklansa xato bermaydi
    }
  }

  /**
   * REST API: Bildirishnomalar ro'yxatini yuklash
   */
  public loadNotifications(page = 1, size = 15): void {
    if (!this.authState.isAuthenticated()) return;

    this.isLoading.set(true);
    this.http.get<ResponseModel<NotificationDto[]>>(`${this.apiUrl}?page=${page}&size=${size}`).subscribe({
      next: res => {
        const data = unwrapResult(res) || [];
        if (page === 1) {
          if (!this.initialLoaded) {
            data.forEach(n => { if (n.id) this.seenNotificationIds.add(n.id); });
            this.initialLoaded = true;
          } else if (this.authState.isCurier()) {
            for (const n of data) {
              if (n.id && !this.seenNotificationIds.has(n.id)) {
                this.seenNotificationIds.add(n.id);
                if (!n.isRead && this.isCurierAssignmentType(n.type)) {
                  this.triggerCurierOrderAlert(n);
                } else if (!n.isRead && this.isCurierOrderEventType(n.type)) {
                  this.lastOrderEventAt.set(Date.now());
                }
              }
            }
          }
          this.notifications.set(data);
        } else {
          data.forEach(n => { if (n.id) this.seenNotificationIds.add(n.id); });
          this.notifications.update(prev => [...prev, ...data]);
        }
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoading.set(false);
        console.warn('Bildirishnomalarni yuklashda xatolik:', err);
      }
    });
  }

  /**
   * REST API: O'qilmagan bildirishnomalar sonini yuklash
   */
  public loadUnreadCount(): void {
    if (!this.authState.isAuthenticated()) return;

    this.http.get<ResponseModel<number>>(`${this.apiUrl}/unread-count`).subscribe({
      next: res => {
        const count = unwrapResult(res) ?? 0;
        this.unreadCount.set(count);
      },
      error: err => {
        console.warn('O\'qilmagan xabarlar sonini yuklashda xatolik:', err);
      }
    });
  }

  /**
   * REST API: Bitta bildirishnomani o'qilgan deb belgilash
   */
  public markAsRead(id: number): void {
    const item = this.notifications().find(n => n.id === id);
    if (item && !item.isRead) {
      // Optimistic update
      this.notifications.update(list =>
        list.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
      this.unreadCount.update(c => Math.max(0, c - 1));
    }

    this.http.post<ResponseModel<boolean>>(`${this.apiUrl}/mark-read/${id}`, {}).subscribe({
      error: err => console.warn(`Notification #${id} markRead xatosi:`, err)
    });
  }

  /**
   * REST API: Barcha bildirishnomalarni o'qilgan deb belgilash
   */
  public markAllAsRead(): void {
    if (this.unreadCount() === 0) return;

    // Optimistic update
    this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
    this.unreadCount.set(0);

    this.http.post<ResponseModel<boolean>>(`${this.apiUrl}/mark-all-read`, {}).subscribe({
      next: () => {
        this.toast.success('Barcha bildirishnomalar o\'qildi deb belgilandi.');
      },
      error: err => console.warn('markAllAsRead xatosi:', err)
    });
  }

  /**
   * Bildirishnoma ustiga bosilganda tegishli sahifaga o'tish
   */
  public handleNotificationClick(item: NotificationDto): void {
    if (!item.isRead) {
      this.markAsRead(item.id);
    }

    // Link bo'yicha yo'naltirish
    if (item.link) {
      if (item.link === '/curier/profile') {
        this.router.navigate([this.authState.isCurier() ? '/curier' : '/profile']);
        return;
      }
      const orderDetailMatch = item.link.match(/^\/orders\/(\d+)$/);
      if (orderDetailMatch) {
        if (this.authState.isCurier()) {
          this.router.navigate(['/curier/orders', orderDetailMatch[1]]);
        } else {
          this.router.navigate(['/orders'], { queryParams: { orderId: orderDetailMatch[1] } });
        }
        return;
      }
      this.router.navigateByUrl(item.link).catch(() => {
        this.router.navigate(['/notifications']);
      });
      return;
    }

    // RelatedEntity bo'yicha yo'naltirish
    if (item.relatedEntityType === 'Order' || item.relatedEntityType === 1) {
      if (this.authState.isCurier()) {
        if (item.relatedEntityId) {
          this.router.navigate(['/curier/orders', item.relatedEntityId]);
        } else {
          this.router.navigate(['/curier/deliveries']);
        }
        return;
      }
      if (item.relatedEntityId) {
        this.router.navigate(['/orders'], { queryParams: { orderId: item.relatedEntityId } });
        return;
      }
      this.router.navigate(['/orders']);
      return;
    }

    if (item.relatedEntityType === 'Product' || item.relatedEntityType === 2) {
      if (this.authState.isCurier()) {
        this.router.navigate(['/curier']);
        return;
      }
      if (item.relatedEntityId) {
        this.router.navigate(['/products', item.relatedEntityId]);
        return;
      }
    }

    if (item.relatedEntityType === 'Curier' || item.relatedEntityType === 4) {
      if (item.relatedEntityId) {
        this.router.navigate(['/admin/curiers', item.relatedEntityId]);
        return;
      }
      this.router.navigate(['/admin/curiers']);
      return;
    }
  }

  /**
   * Tozalash
   */
  private cleanup(): void {
    this.stopSignalR();
    if (this.fallbackPollTimer) {
      clearInterval(this.fallbackPollTimer);
      this.fallbackPollTimer = null;
    }
    this.initialLoaded = false;
    this.seenNotificationIds.clear();
    this.activeCurierPopup.set(null);
    this.notifications.set([]);
    this.unreadCount.set(0);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}
