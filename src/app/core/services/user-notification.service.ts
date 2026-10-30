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

  // Signals - Reaktiv holat
  public notifications = signal<NotificationDto[]>([]);
  public unreadCount = signal<number>(0);
  public isConnected = signal<boolean>(false);
  public isLoading = signal<boolean>(false);

  constructor() {
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
    this.loadUnreadCount();
    this.loadNotifications(1, 15);
    await this.startSignalR();
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

  /**
   * Yangi bildirishnoma kelganda ishlov berish
   */
  private handleIncomingNotification(notification: NotificationDto): void {
    // Ro'yxat boshiga qo'shish
    this.notifications.update(list => [notification, ...list]);

    // O'qilmaganlar sonini oshirish
    this.unreadCount.update(c => c + 1);

    // Ovozli signal chalish
    this.playChime();

    // Ekranda Toast ko'rinishida xabar chiqarish
    this.toast.info(notification.body, notification.title || 'Yangi bildirishnoma');
  }

  /**
   * Web Audio API orqali yumshoq va professional ovozli signal
   */
  private playChime(): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
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
          this.notifications.set(data);
        } else {
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
      this.router.navigateByUrl(item.link);
      return;
    }

    // RelatedEntity bo'yicha yo'naltirish
    if (item.relatedEntityType === 'Order' || item.relatedEntityType === 1) {
      if (item.relatedEntityId) {
        this.router.navigate(['/orders'], { queryParams: { orderId: item.relatedEntityId } });
        return;
      }
      this.router.navigate(['/orders']);
      return;
    }

    if (item.relatedEntityType === 'Product' || item.relatedEntityType === 2) {
      if (item.relatedEntityId) {
        this.router.navigate(['/products', item.relatedEntityId]);
        return;
      }
    }
  }

  /**
   * Tozalash
   */
  private cleanup(): void {
    this.stopSignalR();
    this.notifications.set([]);
    this.unreadCount.set(0);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}
