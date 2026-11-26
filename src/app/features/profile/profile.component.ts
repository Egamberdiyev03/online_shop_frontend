import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CustomerService } from '../../core/services/customer.service';
import { CurierService } from '../../core/services/curier.service';
import { PaymentService } from '../../core/services/payment.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { TelegramService } from '../../core/services/telegram.service';
import { Customer } from '../../core/models/customer.model';
import { CurierResponseDto } from '../../core/models/curier.model';
import { ImageUrlPipe } from '../../shared/pipes/image-url.pipe';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ImageUrlPipe],
  template: `
    <div class="profile-page">
      <!-- Header with gradient -->
      <header class="profile-header">
        <div class="header-top-row">
          <h1 class="header-title">Profil</h1>
          <button
            class="settings-btn"
            (click)="openSettings()"
            aria-label="Sozlamalar"
          >
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>

        <div class="user-info-row">
          <!-- Avatar -->
          <div class="avatar-wrapper">
            <img
              *ngIf="avatarUrl && !avatarBroken"
              [src]="avatarUrl | imageUrl"
              [alt]="displayName"
              class="avatar-img"
              (error)="avatarBroken = true"
            />
            <span *ngIf="!avatarUrl || avatarBroken" class="avatar-initials">{{ initials }}</span>
          </div>

          <!-- Name & Phone -->
          <div class="user-details">
            <h2 class="user-name">{{ displayName }}</h2>
            <div class="user-meta">
              <span class="role-badge" [class]="roleBadgeClass">{{ roleLabel }}</span>
              <span class="user-phone" *ngIf="phoneNumber">{{ phoneNumber }}</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Loading Skeleton -->
      <div class="skeleton-container" *ngIf="isLoading">
        <div class="skeleton-card">
          <div class="skeleton-row" *ngFor="let i of [1,2,3,4]"></div>
        </div>
        <div class="skeleton-card">
          <div class="skeleton-row" *ngFor="let i of [1,2]"></div>
        </div>
      </div>

      <!-- Error State -->
      <div class="error-state" *ngIf="hasError && !isLoading">
        <p class="error-text">Ma'lumotlarni yuklashda xatolik</p>
        <button class="btn btn-primary" (click)="loadProfile()">Qayta urinish</button>
      </div>

      <!-- Menu Cards -->
      <div class="menu-container" *ngIf="!isLoading && !hasError">
        <!-- Card 1: Asosiy -->
        <div class="menu-card menu-card-primary">
          <ng-container *ngIf="authState.isCurier()">
            <a
              routerLink="/curier"
              class="menu-item curier-cabinet-item"
              (click)="onMenuClick()"
            >
              <span class="menu-icon-box icon-curier" aria-hidden="true">🛵</span>
              <span class="menu-text curier-cabinet-text">
                <span class="curier-cabinet-title">Kuryer kabineti</span>
                <span class="curier-cabinet-meta">
                  <span
                    class="curier-status-badge"
                    [class.online]="curierProfile?.isActive && curierProfile?.isOnline"
                    [class.offline]="!curierProfile || !curierProfile.isOnline || !curierProfile.isActive"
                  >
                    <span class="curier-status-dot"></span>
                    {{ curierStatusLabel }}
                  </span>
                  <span
                    class="curier-debt-badge has-debt"
                    *ngIf="curierDebt !== null && curierDebt > 0"
                  >
                    Qarz: {{ formatMoney(curierDebt) }}
                  </span>
                </span>
              </span>
              <span class="menu-arrow" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </span>
            </a>
          </ng-container>

          <ng-container *ngIf="authState.isCustomer()">
            <a
              routerLink="/payments"
              class="menu-item"
              (click)="onMenuClick()"
            >
              <span class="menu-icon-box icon-payments" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </span>
              <span class="menu-text">To'lovlarim</span>
              <span class="menu-arrow" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </span>
            </a>

            <button
              class="menu-item"
              (click)="openComments()"
            >
              <span class="menu-icon-box icon-comments" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </span>
              <span class="menu-text">Sharhlarim</span>
              <span class="menu-arrow" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </span>
            </button>
          </ng-container>

          <ng-container *ngIf="authState.isAdminRole()">
            <a
              *ngIf="authState.userRole() === 'BranchAdmin'"
              routerLink="/products"
              class="menu-item"
              (click)="onMenuClick()"
            >
              <span class="menu-icon-box icon-products" aria-hidden="true">📦</span>
              <span class="menu-text">Mahsulotlar</span>
              <span class="menu-value">Katalog</span>
              <span class="menu-arrow" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </span>
            </a>

            <a
              *ngIf="authState.isBranchManager() && authState.userBranchId()"
              [routerLink]="['/branches', authState.userBranchId()]"
              class="menu-item"
              (click)="onMenuClick()"
            >
              <span class="menu-icon-box icon-branch" aria-hidden="true">🏬</span>
              <span class="menu-text">Mening Filialim</span>
              <span class="menu-value">Boshqaruv</span>
              <span class="menu-arrow" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </span>
            </a>

            <a
              routerLink="/admin/comments"
              class="menu-item"
              (click)="onMenuClick()"
            >
              <span class="menu-icon-box icon-comments" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </span>
              <span class="menu-text">Filial sharhlari</span>
              <span class="menu-value">{{ (authState.isSuperAdmin() || authState.isCompanyAdmin()) ? 'Filtr bilan' : "O'z filiali" }}</span>
              <span class="menu-arrow" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </span>
            </a>

            <a
              routerLink="/admin/payments"
              class="menu-item"
              (click)="onMenuClick()"
            >
              <span class="menu-icon-box icon-payments" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </span>
              <span class="menu-text">To'lovlar</span>
              <span class="menu-value">Tekshirish</span>
              <span class="menu-arrow" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </span>
            </a>

            <a
              routerLink="/admin/curiers"
              class="menu-item"
              (click)="onMenuClick()"
            >
              <span class="menu-icon-box icon-curier" aria-hidden="true">🛵</span>
              <span class="menu-text">Kuryerlar</span>
              <span class="menu-value">{{ authState.isSuperAdmin() ? 'Boshqaruv' : "Ro'yxat" }}</span>
              <span class="menu-arrow" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </span>
            </a>

            <a
              *ngIf="authState.isSuperAdmin() || authState.userRole() === 'BranchManager'"
              routerLink="/admin/cash"
              class="menu-item"
              (click)="onMenuClick()"
            >
              <span class="menu-icon-box icon-cash" aria-hidden="true">💵</span>
              <span class="menu-text">Naqd pul hisobi</span>
              <span class="menu-value">Inkassatsiya</span>
              <span class="menu-arrow" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </span>
            </a>
          </ng-container>

          <a
            routerLink="/map"
            class="menu-item"
            (click)="onMenuClick()"
          >
            <span class="menu-icon-box icon-map" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </span>
            <span class="menu-text">Filiallar joylashuvi</span>
            <span class="menu-value">Xarita</span>
            <span class="menu-arrow" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </span>
          </a>

          <button
            class="menu-item"
            (click)="openNotifications()"
          >
            <span class="menu-icon-box icon-notifications" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </span>
            <span class="menu-text">Bildirishnomalar</span>
            <span class="menu-arrow" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </span>
          </button>

          <ng-container *ngIf="authState.isCustomer()">
            <a
              routerLink="/become-curier"
              class="menu-item"
              (click)="onMenuClick()"
            >
              <span class="menu-icon-box" style="background: #ede9fe; color: #7c3aed;" aria-hidden="true">🛵</span>
              <span class="menu-text">Kuryer bo'lish</span>
              <span class="menu-value">Ariza topshirish</span>
              <span class="menu-arrow" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </span>
            </a>
          </ng-container>
        </div>

        <!-- Card 2: Sozlamalar -->
        <div class="menu-card">
          <button
            class="menu-item"
            (click)="toggleTheme()"
            *ngIf="hasThemeSupport"
          >
            <span class="menu-icon-box icon-theme" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            </span>
            <span class="menu-text">Mavzu</span>
            <span class="menu-value">{{ currentThemeLabel }}</span>
            <span class="menu-arrow" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </span>
          </button>

          <div class="menu-divider" *ngIf="hasThemeSupport"></div>

          <button
            class="menu-item"
            (click)="openHelp()"
          >
            <span class="menu-icon-box icon-help" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </span>
            <span class="menu-text">Yordam va aloqa</span>
            <span class="menu-arrow" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </span>
          </button>
        </div>

        <!-- Logout Button -->
        <button
          class="logout-btn"
          (click)="logout()"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Chiqish</span>
        </button>
      </div>

      <!-- Help & Support Modal -->
      <div class="support-modal-overlay" *ngIf="showHelpModal" (click)="closeHelp()">
        <div class="support-modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="profileHelpTitle">
          <div class="support-modal-header">
            <h3 id="profileHelpTitle">💬 Yordam va qo'llab-quvvatlash</h3>
            <button type="button" class="support-close-btn" (click)="closeHelp()" aria-label="Yopish">&times;</button>
          </div>
          <div class="support-modal-body">
            <p class="support-desc">Buyurtmalar, to'lovlar yoki texnik savollar bo'yicha operatorimiz bilan bog'lanishingiz mumkin:</p>
            <div class="support-contact-box">
              <span class="support-handle">&#64;{{ supportUsername }}</span>
              <button type="button" class="support-copy-btn" (click)="copySupportHandle()">
                {{ supportCopied ? '✓ Nusxalandi' : '📋 Nusxalash' }}
              </button>
            </div>
            <p class="support-hours">🕒 Ish vaqti: Har kuni, 09:00 – 21:00</p>
          </div>
          <div class="support-modal-footer">
            <button type="button" class="support-btn-sec" (click)="closeHelp()">Yopish</button>
            <button type="button" class="support-btn-pri" (click)="openTelegramSupport()">✈️ Telegramda yozish ↗</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-page {
      min-height: 100vh;
      min-height: 100dvh;
      background: var(--bg-main, #f8fafc);
      padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
    }

    /* ===== HEADER ===== */
    .profile-header {
      background: linear-gradient(160deg, #3F37C9 0%, #5B4EF0 100%);
      padding: 20px;
      padding-top: calc(20px + env(safe-area-inset-top, 0px));
      border-radius: 0 0 28px 28px;
    }

    .header-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .header-title {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }

    .settings-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.15);
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      cursor: pointer;
      transition: background 0.2s;
      -webkit-tap-highlight-color: transparent;
    }

    .settings-btn:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .settings-btn:active {
      transform: scale(0.95);
    }

    .user-info-row {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .avatar-wrapper {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      border: 3px solid rgba(255, 255, 255, 0.3);
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-initials {
      font-size: 24px;
      font-weight: 700;
      color: #3F37C9;
      text-transform: uppercase;
    }

    .user-details {
      flex: 1;
      min-width: 0;
    }

    .user-name {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .role-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .role-super-admin {
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      color: #78350f;
    }

    .role-company-admin {
      background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
      color: #1e1b4b;
    }

    .role-branch-manager {
      background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
      color: #064e3b;
    }

    .role-branch-admin {
      background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
      color: #1e3a5f;
    }

    .role-customer {
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }

    .role-curier {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      color: #ffffff;
    }

    .user-phone {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
    }

    /* ===== SKELETON ===== */
    .skeleton-container {
      padding: 16px;
    }

    .skeleton-card {
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 20px;
      padding: 8px 0;
      margin-bottom: 12px;
    }

    .skeleton-row {
      height: 56px;
      margin: 0 16px;
      background: linear-gradient(90deg, var(--bg-subtle, #f1f5f9) 25%, var(--bg-card, #ffffff) 50%, var(--bg-subtle, #f1f5f9) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 8px;
    }

    .skeleton-row + .skeleton-row {
      margin-top: 8px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ===== ERROR STATE ===== */
    .error-state {
      padding: 48px 24px;
      text-align: center;
    }

    .error-text {
      color: var(--text-muted, #64748b);
      margin-bottom: 16px;
    }

    /* ===== MENU CONTAINER ===== */
    .menu-container {
      padding: 16px;
    }

    .menu-card {
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 20px;
      margin-bottom: 12px;
      overflow: hidden;
    }

    .menu-item {
      display: flex;
      align-items: center;
      width: 100%;
      min-height: 56px;
      padding: 12px 16px;
      background: transparent;
      border: none;
      text-decoration: none;
      color: var(--text-main, #0f172a);
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
      -webkit-tap-highlight-color: transparent;
      gap: 12px;
    }

    .menu-item:hover {
      background: var(--bg-subtle, #f1f5f9);
    }

    .menu-item:active {
      background: var(--border, #e2e8f0);
    }

    .menu-icon-box {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .curier-cabinet-item {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.11) 0%, rgba(16, 185, 129, 0.04) 100%);
      border-left: 4px solid #16a34a;
      padding-left: 12px;
    }

    .curier-cabinet-item:hover {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.16) 0%, rgba(16, 185, 129, 0.08) 100%);
    }

    .icon-curier {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      color: #ffffff;
      font-size: 18px;
    }

    .icon-cash {
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
      color: #ffffff;
      font-size: 18px;
    }

    .icon-products {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: #ffffff;
      font-size: 18px;
    }

    .icon-branch {
      background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
      color: #ffffff;
      font-size: 18px;
    }

    .menu-card-primary > .menu-item + .menu-item {
      border-top: 1px solid var(--border, #e2e8f0);
    }

    .curier-cabinet-text {
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 0;
    }

    .curier-cabinet-title {
      font-weight: 600;
    }

    .curier-cabinet-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .curier-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      background: #f1f5f9;
      color: #64748b;
    }

    .curier-status-badge.online {
      background: #dcfce7;
      color: #15803d;
    }

    .curier-status-badge.offline {
      background: #f1f5f9;
      color: #64748b;
    }

    .curier-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
    }

    .curier-debt-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      background: #f1f5f9;
      color: #475569;
    }

    .curier-debt-badge.has-debt {
      background: #fef3c7;
      color: #b45309;
    }

    .icon-payments {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff;
    }

    .icon-comments {
      background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
      color: #ffffff;
    }

    .icon-map {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: #ffffff;
    }

    .icon-notifications {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #ffffff;
    }

    .icon-theme {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: #ffffff;
    }

    .icon-help {
      background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
      color: #ffffff;
    }

    .menu-text {
      flex: 1;
      text-align: left;
    }

    .menu-value {
      color: var(--text-muted, #64748b);
      font-size: 14px;
      font-weight: 400;
    }

    .menu-arrow {
      color: var(--text-light, #94a3b8);
      display: flex;
      align-items: center;
    }

    .menu-divider {
      height: 1px;
      background: var(--border, #e2e8f0);
      margin: 0 16px;
    }

    /* ===== LOGOUT BUTTON ===== */
    .logout-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      height: 52px;
      background: transparent;
      border: 1px solid #FF9AA8;
      border-radius: 16px;
      color: #FF9AA8;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 8px;
      -webkit-tap-highlight-color: transparent;
    }

    .logout-btn:hover {
      background: rgba(255, 154, 168, 0.1);
    }

    .logout-btn:active {
      transform: scale(0.98);
      background: rgba(255, 154, 168, 0.15);
    }

    /* ===== DARK THEME ===== */
    :host-context(body.dark-theme) .profile-page,
    :host-context(.dark-theme) .profile-page {
      background: var(--bg-main, #0b0f19);
    }

    :host-context(body.dark-theme) .profile-header,
    :host-context(.dark-theme) .profile-header {
      background: linear-gradient(160deg, #2D2799 0%, #4338CA 100%);
    }

    :host-context(body.dark-theme) .avatar-wrapper,
    :host-context(.dark-theme) .avatar-wrapper {
      background: #1e1b4b;
      border-color: rgba(255, 255, 255, 0.2);
    }

    :host-context(body.dark-theme) .avatar-initials,
    :host-context(.dark-theme) .avatar-initials {
      color: #a5b4fc;
    }

    :host-context(body.dark-theme) .menu-card,
    :host-context(.dark-theme) .menu-card {
      background: var(--bg-card, #151e32);
      border-color: var(--border, #232B45);
    }

    :host-context(body.dark-theme) .menu-item,
    :host-context(.dark-theme) .menu-item {
      color: var(--text-main, #f8fafc);
    }

    :host-context(body.dark-theme) .menu-item:hover,
    :host-context(.dark-theme) .menu-item:hover {
      background: var(--bg-subtle, #1e293b);
    }

    :host-context(body.dark-theme) .menu-item:active,
    :host-context(.dark-theme) .menu-item:active {
      background: var(--border, #334155);
    }

    :host-context(body.dark-theme) .menu-value,
    :host-context(.dark-theme) .menu-value {
      color: var(--text-muted, #94a3b8);
    }

    :host-context(body.dark-theme) .menu-arrow,
    :host-context(.dark-theme) .menu-arrow {
      color: var(--text-light, #64748b);
    }

    :host-context(body.dark-theme) .menu-divider,
    :host-context(.dark-theme) .menu-divider {
      background: var(--border, #232B45);
    }

    :host-context(body.dark-theme) .skeleton-card,
    :host-context(.dark-theme) .skeleton-card {
      background: var(--bg-card, #151e32);
      border-color: var(--border, #232B45);
    }

    :host-context(body.dark-theme) .skeleton-row,
    :host-context(.dark-theme) .skeleton-row {
      background: linear-gradient(90deg, #1e293b 25%, #151e32 50%, #1e293b 75%);
      background-size: 200% 100%;
    }

    :host-context(body.dark-theme) .logout-btn,
    :host-context(.dark-theme) .logout-btn {
      border-color: #FF6B7A;
      color: #FF6B7A;
    }

    :host-context(body.dark-theme) .logout-btn:hover,
    :host-context(.dark-theme) .logout-btn:hover {
      background: rgba(255, 107, 122, 0.1);
    }

    :host-context(body.dark-theme) .curier-status-badge.offline,
    :host-context(.dark-theme) .curier-status-badge.offline {
      background: #1e293b;
      color: #94a3b8;
    }

    :host-context(body.dark-theme) .curier-status-badge.online,
    :host-context(.dark-theme) .curier-status-badge.online {
      background: rgba(34, 197, 94, 0.18);
      color: #4ade80;
    }

    :host-context(body.dark-theme) .curier-debt-badge,
    :host-context(.dark-theme) .curier-debt-badge {
      background: #1e293b;
      color: #cbd5e1;
    }

    :host-context(body.dark-theme) .curier-debt-badge.has-debt,
    :host-context(.dark-theme) .curier-debt-badge.has-debt {
      background: rgba(245, 158, 11, 0.18);
      color: #fbbf24;
    }

    :host-context(body.dark-theme) .curier-cabinet-item,
    :host-context(.dark-theme) .curier-cabinet-item {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.06) 100%);
      border-left-color: #22c55e;
    }

    :host-context(body.dark-theme) .curier-cabinet-item:hover,
    :host-context(.dark-theme) .curier-cabinet-item:hover {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.22) 0%, rgba(16, 185, 129, 0.1) 100%);
    }

    :host-context(body.dark-theme) .menu-card-primary > .menu-item + .menu-item,
    :host-context(.dark-theme) .menu-card-primary > .menu-item + .menu-item {
      border-top-color: var(--border, #232B45);
    }

    .support-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1200;
      padding: 1rem;
    }
    .support-modal {
      width: 100%;
      max-width: 420px;
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 16px;
      box-shadow: 0 20px 45px rgba(15, 23, 42, 0.22);
      overflow: hidden;
    }
    .support-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border, #e2e8f0);
    }
    .support-modal-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-main, #0f172a);
    }
    .support-close-btn {
      background: transparent;
      border: none;
      font-size: 1.4rem;
      line-height: 1;
      color: var(--text-muted, #475569);
      cursor: pointer;
    }
    .support-modal-body {
      padding: 1.15rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .support-desc,
    .support-hours {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-muted, #475569);
      line-height: 1.5;
    }
    .support-contact-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.7rem 0.9rem;
      background: var(--bg-subtle, #f1f5f9);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 10px;
    }
    .support-handle {
      font-weight: 700;
      color: var(--primary, #4f46e5);
    }
    .support-copy-btn,
    .support-btn-sec,
    .support-btn-pri {
      padding: 0.5rem 0.9rem;
      border-radius: 9px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
    }
    .support-copy-btn,
    .support-btn-sec {
      background: var(--bg-card, #ffffff);
      border-color: var(--border, #cbd5e1);
      color: var(--text-main, #0f172a);
    }
    .support-btn-pri {
      background: #4f46e5;
      color: #ffffff;
    }
    .support-modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.65rem;
      padding: 0.9rem 1.25rem;
      border-top: 1px solid var(--border, #e2e8f0);
    }
    :host-context(body.dark-theme) .support-modal,
    :host-context(.dark-theme) .support-modal {
      background: #151e32;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .support-modal-header h3,
    :host-context(.dark-theme) .support-modal-header h3 {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .support-desc,
    :host-context(.dark-theme) .support-desc,
    :host-context(body.dark-theme) .support-hours,
    :host-context(.dark-theme) .support-hours {
      color: #cbd5e1;
    }
    :host-context(body.dark-theme) .support-contact-box,
    :host-context(.dark-theme) .support-contact-box {
      background: #0f172a;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .support-copy-btn,
    :host-context(.dark-theme) .support-copy-btn,
    :host-context(body.dark-theme) .support-btn-sec,
    :host-context(.dark-theme) .support-btn-sec {
      background: #1e293b;
      border-color: #334155;
      color: #e2e8f0;
    }
  `]
})
export class ProfileComponent implements OnInit, OnDestroy {
  private customerService = inject(CustomerService);
  private curierService = inject(CurierService);
  private paymentService = inject(PaymentService);
  public authState = inject(AuthStateService);
  private notification = inject(NotificationService);
  private tg = inject(TelegramService);
  private router = inject(Router);

  currentCustomer: Customer | null = null;
  curierProfile: CurierResponseDto | null = null;
  curierDebt: number | null = null;
  isLoading = true;
  hasError = false;
  tgPhotoUrl = '';
  avatarBroken = false;
  showHelpModal = false;
  supportCopied = false;
  supportUsername = environment.telegramSupportUsername;

  // Theme support - Telegram Mini App'da mavjud
  hasThemeSupport = true;
  currentTheme: 'auto' | 'light' | 'dark' = 'auto';

  private backButtonCallback?: () => void;

  ngOnInit(): void {
    this.loadProfile();
    this.loadTelegramUserPhoto();
    this.checkThemeSupport();
  }

  ngOnDestroy(): void {
    if (this.backButtonCallback) {
      this.tg.hideBackButton();
    }
  }

  private loadTelegramUserPhoto(): void {
    const tgUser = this.tg.telegramUser;
    if (tgUser?.photoUrl) {
      this.tgPhotoUrl = tgUser.photoUrl;
    }
  }

  private checkThemeSupport(): void {
    // Telegram Mini App'da theme avtomatik boshqariladi
    // Agar brauzerda bo'lsa, foydalanuvchi o'zgartira olmaydi
    this.hasThemeSupport = this.tg.isMiniApp();

    if (document.body.classList.contains('dark-theme')) {
      this.currentTheme = 'dark';
    } else {
      this.currentTheme = 'light';
    }
  }

  loadProfile(): void {
    this.isLoading = true;
    this.hasError = false;
    this.avatarBroken = false;
    const userId = this.authState.currentCustomerId();

    if (!userId) {
      this.isLoading = false;
      this.hasError = true;
      return;
    }

    if (this.authState.isCurier()) {
      forkJoin({
        customer: this.customerService.getById(userId).pipe(catchError(() => of(null))),
        curier: this.curierService.getMyProfile().pipe(catchError(() => of(null))),
        cashSummary: this.paymentService.getMyCashSummary().pipe(catchError(() => of(null)))
      }).subscribe({
        next: ({ customer, curier, cashSummary }) => {
          this.currentCustomer = customer;
          this.curierProfile = curier;
          this.curierDebt = cashSummary ? (cashSummary.debt ?? 0) : null;
          this.isLoading = false;
          this.hasError = !customer && !curier;
        },
        error: () => {
          this.isLoading = false;
          this.hasError = true;
        }
      });
      return;
    }

    this.curierProfile = null;
    this.curierDebt = null;
    this.customerService.getById(userId).subscribe({
      next: (customer) => {
        this.currentCustomer = customer;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.hasError = true;
      }
    });
  }

  get avatarUrl(): string {
    const curierPhoto = this.curierProfile?.profilePictureUrl?.trim();
    if (this.authState.isCurier()) {
      return curierPhoto || '';
    }
    return curierPhoto || this.tgPhotoUrl || '';
  }

  get curierStatusLabel(): string {
    if (!this.curierProfile) return 'Offline';
    if (!this.curierProfile.isActive) return 'Tasdiqlanmagan';
    return this.curierProfile.isOnline ? 'Online' : 'Offline';
  }

  formatMoney(amount: number): string {
    return new Intl.NumberFormat('uz-UZ').format(amount || 0) + " so'm";
  }

  get displayName(): string {
    // Telegram user nomi
    const tgUser = this.tg.telegramUser;
    if (tgUser?.firstName) {
      return [tgUser.firstName, tgUser.lastName].filter(Boolean).join(' ');
    }
    // Backend dan
    return this.curierProfile?.name || this.currentCustomer?.name || this.authState.userName() || 'Foydalanuvchi';
  }

  get initials(): string {
    const name = this.displayName.trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name.slice(0, 2) || 'F').toUpperCase();
  }

  get phoneNumber(): string {
    return this.curierProfile?.phoneNumber || this.currentCustomer?.phoneNumber || '';
  }

  get currentThemeLabel(): string {
    if (this.currentTheme === 'auto') return 'Avto';
    if (this.currentTheme === 'dark') return 'Tun';
    return 'Kun';
  }

  get roleLabel(): string {
    const role = this.authState.userRole();
    switch (role) {
      case 'SuperAdmin': return 'Super Admin';
      case 'CompanyAdmin': return 'Kompaniya Admin';
      case 'BranchManager': return 'Filial Mudiri';
      case 'BranchAdmin': return 'Filial Admin';
      case 'Curier': return 'Kuryer';
      default: return 'Mijoz';
    }
  }

  get roleBadgeClass(): string {
    const role = this.authState.userRole();
    switch (role) {
      case 'SuperAdmin': return 'role-super-admin';
      case 'CompanyAdmin': return 'role-company-admin';
      case 'BranchManager': return 'role-branch-manager';
      case 'BranchAdmin': return 'role-branch-admin';
      case 'Curier': return 'role-curier';
      default: return 'role-customer';
    }
  }

  onMenuClick(): void {
    this.tg.hapticImpact('light');
  }

  openSettings(): void {
    this.tg.hapticImpact('light');
    this.router.navigate(['/profile/settings']);
  }

  openComments(): void {
    this.tg.hapticImpact('light');
    this.router.navigate(['/profile/comments']);
  }

  openNotifications(): void {
    this.tg.hapticImpact('light');
    this.router.navigate(['/notifications']);
  }

  toggleTheme(): void {
    this.tg.hapticImpact('light');

    // Theme toggle qilish
    if (this.currentTheme === 'light') {
      this.currentTheme = 'dark';
      document.body.classList.add('dark-theme');
    } else {
      this.currentTheme = 'light';
      document.body.classList.remove('dark-theme');
    }
  }

  openHelp(): void {
    this.tg.hapticImpact('light');
    this.supportCopied = false;
    this.showHelpModal = true;
  }

  closeHelp(): void {
    this.showHelpModal = false;
  }

  copySupportHandle(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`@${this.supportUsername}`).then(() => {
        this.supportCopied = true;
      }).catch(() => {});
    }
  }

  openTelegramSupport(): void {
    const telegramUrl = `https://t.me/${this.supportUsername}`;

    if (this.tg.isMiniApp()) {
      this.tg.openTelegramLink(telegramUrl);
    } else {
      window.open(telegramUrl, '_blank', 'noopener,noreferrer');
    }
  }

  async logout(): Promise<void> {
    this.tg.hapticImpact('medium');

    const confirmed = await this.tg.showConfirm('Haqiqatan ham tizimdan chiqmoqchimisiz?');

    if (confirmed) {
      this.tg.hapticNotification('success');
      this.authState.clearSession();
      this.router.navigate(['/login']);
    }
  }
}
