import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CurierService } from '../../../core/services/curier.service';
import { PaymentService } from '../../../core/services/payment.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UserNotificationService } from '../../../core/services/user-notification.service';
import { CurierLocationService } from '../../../core/services/curier-location.service';
import { CurierResponseDto, CurierCashSummaryDto, TransportTypeLabels, TransportTypeIcons } from '../../../core/models/curier.model';
import { ImageUrlPipe } from '../../../shared/pipes/image-url.pipe';

@Component({
  selector: 'app-curier-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ImageUrlPipe],
  templateUrl: './curier-dashboard.component.html',
  styleUrl: './curier-dashboard.component.css'
})
export class CurierDashboardComponent implements OnInit {
  private curierService = inject(CurierService);
  private paymentService = inject(PaymentService);
  private notification = inject(NotificationService);
  private userNotification = inject(UserNotificationService);
  public curierLocation = inject(CurierLocationService);

  profile = signal<CurierResponseDto | null>(null);
  cashSummary = signal<CurierCashSummaryDto | null>(null);
  loading = signal(true);
  togglingOnline = signal(false);
  avatarBroken = signal(false);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.curierService.getMyProfile().subscribe({
      next: (p) => {
        this.profile.set(p);
        this.loading.set(false);
        this.curierLocation.syncFromProfile(p);
        this.loadCashSummary();
      },
      error: () => {
        this.notification.error('Profil yuklanmadi');
        this.loading.set(false);
      }
    });
  }

  loadCashSummary(): void {
    this.paymentService.getMyCashSummary().subscribe({
      next: (s) => this.cashSummary.set(s),
      error: () => {}
    });
  }

  toggleOnline(): void {
    const p = this.profile();
    if (!p || this.togglingOnline()) return;

    const newState = !p.isOnline;
    this.togglingOnline.set(true);

    this.curierService.setOnline(newState).subscribe({
      next: () => {
        const updated = { ...p, isOnline: newState };
        this.profile.set(updated);
        this.togglingOnline.set(false);
        this.curierLocation.syncFromProfile(updated);
        if (newState) {
          this.notification.replace('success', 'Online holatdasiz', 'Ish holati');
        } else {
          this.notification.replace('info', 'Offline holatdasiz', 'Ish holati');
        }
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Xatolik yuz berdi';
        this.notification.error(msg);
        this.togglingOnline.set(false);
      }
    });
  }

  getInitials(name?: string): string {
    const trimmed = (name || '').trim();
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (trimmed.slice(0, 2) || 'K').toUpperCase();
  }

  getTransportLabel(type: number): string {
    return TransportTypeLabels[type] || 'Noma\'lum';
  }

  getTransportEmoji(type: number): string {
    return TransportTypeIcons[type] || '';
  }

  formatMoney(amount: number): string {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
  }

  testSound(): void {
    this.userNotification.testCurierSound();
    this.notification.success('Bildirishnoma ovozi yoqildi va tekshirildi');
  }
}
