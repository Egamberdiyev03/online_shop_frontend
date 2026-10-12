import { Component, OnInit, inject, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as L from 'leaflet';
import { CompanyService } from '../../../core/services/company.service';
import { MapService, MapLocation } from '../../../core/services/map.service';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CompanyBranch } from '../../../core/models/company-branch.model';

@Component({
  selector: 'app-branches-map',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="map-page-wrapper">
      <!-- 1. Top Compact Header Bar -->
      <header class="map-topbar">
        <div class="topbar-info">
          <div class="title-with-icon">
            <span class="topbar-icon">🗺️</span>
            <h1 class="topbar-title">Filiallar Xaritasi</h1>
          </div>
          <p class="topbar-desc">Filiallarimiz joylashuvi, aloqa maʼlumotlari va xarita yoʻnalishlari</p>
        </div>

        <div class="topbar-actions">
          <button
            type="button"
            class="topbar-btn"
            (click)="locateUser()"
            [disabled]="isLocating"
            title="Mening joylashuvim"
          >
            <span class="btn-icon">{{ isLocating ? '⏳' : '📍' }}</span>
            <span class="btn-label">{{ isLocating ? 'Aniqlanmoqda...' : 'Mening joyim' }}</span>
          </button>
          <button
            type="button"
            class="topbar-btn"
            (click)="fitAllBranches()"
            title="Barcha filiallarni koʻrish"
            *ngIf="branchesWithCoords.length > 0"
          >
            <span class="btn-icon">🔍</span>
            <span class="btn-label">Barchasini koʻrish</span>
          </button>
        </div>
      </header>

      <!-- 2. Warning Banner for Missing Coordinates -->
      <div class="coords-warning-banner" *ngIf="noCoordsWarning">
        <div class="banner-inner">
          <span class="banner-icon">⚠️</span>
          <span class="banner-text">{{ noCoordsWarning }}</span>
          <button type="button" class="banner-close-btn" (click)="closeCoordsWarning()" title="Yopish">&times;</button>
        </div>
      </div>

      <!-- 2.1 Closest Branch Alert Banner -->
      <div class="closest-branch-banner" *ngIf="closestBranchInfo">
        <div class="banner-inner">
          <span class="banner-icon">🎯</span>
          <span class="banner-text">
            Eng yaqin filial: <strong>{{ closestBranchInfo.name }}</strong> ({{ closestBranchInfo.distance }} km)
          </span>
          <button type="button" class="banner-action-btn" (click)="goToClosestBranch()">
            Xaritada koʻrsatish
          </button>
          <button type="button" class="banner-close-btn" (click)="closeClosestBranch()" title="Yopish">&times;</button>
        </div>
      </div>

      <!-- 3. Loading Skeleton State -->
      <div class="map-skeleton-container" *ngIf="isLoading">
        <div class="skeleton-map-pane">
          <div class="skeleton-pulse-circle"></div>
          <p class="skeleton-text">Filiallar va xarita maʼlumotlari yuklanmoqda...</p>
        </div>
        <div class="skeleton-sidebar-pane">
          <div class="skeleton-line title"></div>
          <div class="skeleton-line search"></div>
          <div class="skeleton-card" *ngFor="let i of [1, 2, 3, 4]"></div>
        </div>
      </div>

      <!-- 4. Error State -->
      <div class="map-error-container" *ngIf="!isLoading && loadError">
        <div class="error-card">
          <span class="error-icon">⚠️</span>
          <h3 class="error-title">Xatolik yuz berdi</h3>
          <p class="error-message">{{ loadError }}</p>
          <button type="button" class="retry-btn" (click)="loadBranches()">
            <span>🔄</span> Qayta urinish
          </button>
        </div>
      </div>

      <!-- 5. Main Split View: Map (Left 70%) & Sidebar (Right 30%) -->
      <main class="map-main-layout" *ngIf="!isLoading && !loadError">
        <!-- LEFT: Map Container (~70%) -->
        <section class="map-viewport-section">
          <div id="branches-map" class="leaflet-map-canvas"></div>

          <!-- Empty Coordinates Overlay -->
          <div class="no-coords-overlay" *ngIf="branches.length > 0 && branchesWithCoords.length === 0">
            <div class="no-coords-box">
              <span class="box-icon">🗺️</span>
              <h4>Filiallar uchun koordinata kiritilmagan</h4>
              <p>Hozircha tizimdagi filiallar uchun xaritada koʻrsatish koordinatalari mavjud emas.</p>
            </div>
          </div>
        </section>

        <!-- RIGHT: Branches Sidebar (~30%, sticky, scrollable) -->
        <aside class="branches-sidebar-panel">
          <!-- Sidebar Header & Search -->
          <div class="sidebar-header-box">
            <div class="sidebar-meta-line">
              <h2 class="sidebar-title">Filiallar</h2>
              <span class="counter-badge" [class.has-coords]="branchesWithCoords.length > 0">
                🗺️ {{ branchesWithCoords.length }}/{{ branches.length }} xaritada
              </span>
            </div>

            <!-- Search Field -->
            <div class="search-input-wrapper">
              <span class="search-lens-icon">🔍</span>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                placeholder="Filial nomi yoki manzili..."
                class="sidebar-search-field"
              />
              <button
                type="button"
                *ngIf="searchQuery"
                class="search-clear-btn"
                (click)="searchQuery = ''"
                title="Tozalash"
              >&times;</button>
            </div>

            <div class="search-results-info" *ngIf="searchQuery">
              Topildi: <strong>{{ filteredAllBranches.length }}</strong> ta filial
            </div>
          </div>

          <!-- Scrollable Branches List -->
          <div class="sidebar-scrollable-list">
            <div
              *ngFor="let branch of filteredAllBranches"
              [attr.id]="'branch-item-' + branch.id"
              class="branch-list-card"
              [class.active]="selectedBranch?.id === branch.id"
              [class.has-no-coords]="!hasCoords(branch)"
              (click)="selectBranch(branch, true)"
            >
              <div class="card-top-row">
                <div class="card-pin-box" [class.no-pin]="!hasCoords(branch)">
                  {{ hasCoords(branch) ? '📍' : '🏬' }}
                </div>

                <div class="card-title-block">
                  <h3 class="card-branch-name" [title]="branch.name">{{ branch.name }}</h3>
                  <p class="card-branch-address" [title]="branch.address">
                    {{ branch.address }}
                  </p>
                </div>

                <!-- Batafsil ko'rish tugmasi (faqat ruxsatli foydalanuvchilar uchun) -->
                <a
                  *ngIf="canViewBranchDetails(branch)"
                  [routerLink]="['/branches', branch.id]"
                  class="card-details-arrow-btn"
                  title="Filial boshqaruvi va mahsulotlari"
                  (click)="$event.stopPropagation()"
                >
                  &rarr;
                </a>
              </div>

              <div class="card-bottom-row">
                <span class="card-phone" *ngIf="branch.phoneNumber">
                  📞 {{ branch.phoneNumber }}
                </span>

                <span class="card-distance" *ngIf="branch.distance">
                  🧭 {{ branch.distance }} km
                </span>

                <span class="card-no-coords-tag" *ngIf="!hasCoords(branch)">
                  Koordinata yoʻq
                </span>

                <span class="card-view-hint" *ngIf="hasCoords(branch)">
                  Xaritada koʻrish &rsaquo;
                </span>
              </div>
            </div>

            <!-- Empty List State -->
            <div class="sidebar-empty-state" *ngIf="filteredAllBranches.length === 0">
              <span class="empty-emoji">🔍</span>
              <h4 class="empty-title">Filial topilmadi</h4>
              <p class="empty-desc">
                {{ searchQuery ? "Qidiruv soʻziga mos filial topilmadi." : "Hozircha filiallar roʻyxati boʻsh." }}
              </p>
              <button
                type="button"
                class="empty-reset-btn"
                *ngIf="searchQuery"
                (click)="searchQuery = ''"
              >
                Qidiruvni tozalash
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  `,
  styles: [`
    /* ========================================================
       1. MAIN PAGE LAYOUT & CONTAINERS
       ======================================================== */
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      height: 100%;
      overflow: hidden;
    }

    /* Prevent document-level scrolling on desktop */
    @media (min-width: 769px) {
      ::ng-deep body.map-active-page {
        overflow: hidden !important;
        height: 100vh !important;
      }

      ::ng-deep body.map-active-page app-root {
        display: flex;
        flex-direction: column;
        height: 100vh;
        overflow: hidden;
      }

      ::ng-deep body.map-active-page app-navbar {
        flex-shrink: 0;
      }

      ::ng-deep body.map-active-page .main-content {
        flex: 1;
        min-height: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      ::ng-deep body.map-active-page app-footer {
        display: none !important;
      }
    }

    .map-page-wrapper {
      flex: 1;
      min-height: 0;
      height: 100%;
      background-color: #f8fafc;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Top Compact Header Bar */
    .map-topbar {
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      padding: 0.75rem 1.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.25rem;
      flex-wrap: wrap;
      z-index: 20;
      flex-shrink: 0;
    }

    .topbar-info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .title-with-icon {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .topbar-icon {
      font-size: 1.4rem;
      line-height: 1;
    }

    .topbar-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .topbar-desc {
      font-size: 0.825rem;
      color: #64748b;
      margin: 0;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .topbar-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      padding: 0.5rem 0.95rem;
      font-size: 0.825rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      min-height: 40px;
    }

    .topbar-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
      border-color: #94a3b8;
    }

    /* Warning Banner */
    .coords-warning-banner {
      background: #fffbeb;
      border-bottom: 1px solid #fde68a;
      padding: 0.65rem 1.75rem;
      animation: bannerSlide 0.25s ease-out;
      flex-shrink: 0;
    }

    .banner-inner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .banner-icon {
      font-size: 1.15rem;
      line-height: 1;
    }

    .coords-warning-banner .banner-text {
      color: #92400e;
      font-size: 0.85rem;
      font-weight: 600;
      flex: 1;
    }

    .coords-warning-banner .banner-close-btn {
      background: transparent;
      border: none;
      color: #b45309;
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      transition: background 0.2s;
    }

    .coords-warning-banner .banner-close-btn:hover {
      background: rgba(180, 83, 9, 0.1);
      color: #78350f;
    }

    @keyframes bannerSlide {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* 2.1 Closest Branch Banner */
    .closest-branch-banner {
      background: #e0f2fe;
      border-bottom: 1px solid #bae6fd;
      padding: 0.55rem 1.75rem;
      animation: bannerSlide 0.25s ease-out;
      flex-shrink: 0;
    }

    .closest-branch-banner .banner-text {
      color: #0369a1;
      font-size: 0.85rem;
      font-weight: 600;
      flex: 1;
    }

    .closest-branch-banner .banner-text strong {
      color: #0c4a6e;
    }

    .closest-branch-banner .banner-action-btn {
      background: #0284c7;
      color: #ffffff;
      border: none;
      padding: 0.4rem 0.95rem;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s;
      min-height: 36px;
    }

    .closest-branch-banner .banner-action-btn:hover {
      background: #0369a1;
    }

    .closest-branch-banner .banner-close-btn {
      background: transparent;
      border: none;
      color: #0369a1;
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      transition: background 0.2s;
    }

    .closest-branch-banner .banner-close-btn:hover {
      background: rgba(3, 105, 161, 0.1);
      color: #0c4a6e;
    }

    @keyframes userPulseRing {
      0% { transform: scale(0.85); opacity: 0.95; }
      100% { transform: scale(2.0); opacity: 0; }
    }

    /* ========================================================
       2. MAIN SPLIT GRID (Map Left 1fr, Sidebar Right 380px)
       ======================================================== */
    .map-main-layout {
      flex: 1;
      min-height: 0;
      display: grid;
      grid-template-columns: 1fr 380px;
      height: 100%;
      overflow: hidden;
    }

    /* Map Viewport (Left) */
    .map-viewport-section {
      height: 100%;
      width: 100%;
      min-height: 300px;
      position: relative;
      background: #e2e8f0;
      overflow: hidden;
      overscroll-behavior: contain;
    }

    .leaflet-map-canvas {
      width: 100%;
      height: 100%;
      overscroll-behavior: contain;
      z-index: 1;
    }

    .no-coords-overlay {
      position: absolute;
      inset: 0;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 500;
      padding: 2rem;
    }

    .no-coords-box {
      text-align: center;
      max-width: 440px;
      background: #ffffff;
      padding: 2.25rem 2rem;
      border-radius: 18px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1);
      border: 1px solid #e2e8f0;
    }

    .box-icon {
      font-size: 3.5rem;
      display: block;
      margin-bottom: 0.75rem;
    }

    .no-coords-box h4 {
      font-size: 1.2rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.5rem;
    }

    .no-coords-box p {
      font-size: 0.875rem;
      color: #64748b;
      line-height: 1.5;
      margin: 0;
    }

    /* Branches Sidebar (Right) */
    .branches-sidebar-panel {
      height: 100%;
      min-height: 0;
      width: 380px;
      background: #ffffff;
      border-left: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 10;
    }

    .sidebar-header-box {
      padding: 1.15rem 1.25rem 0.85rem;
      border-bottom: 1px solid #f1f5f9;
      background: #ffffff;
      flex-shrink: 0;
    }

    .sidebar-meta-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }

    .sidebar-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }

    .counter-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 20px;
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }

    .counter-badge.has-coords {
      background: #ecfdf5;
      color: #047857;
      border-color: #a7f3d0;
    }

    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-lens-icon {
      position: absolute;
      left: 0.85rem;
      color: #94a3b8;
      font-size: 0.95rem;
      pointer-events: none;
    }

    .sidebar-search-field {
      width: 100%;
      padding: 0.6rem 2.2rem 0.6rem 2.4rem;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 0.875rem;
      color: #0f172a;
      background: #f8fafc;
      outline: none;
      transition: all 0.2s ease;
    }

    .sidebar-search-field:focus {
      border-color: #6366f1;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
    }

    .search-clear-btn {
      position: absolute;
      right: 0.65rem;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1.15rem;
      line-height: 1;
      padding: 0.2rem;
    }

    .search-results-info {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.5rem;
    }

    /* Scrollable Cards Container */
    .sidebar-scrollable-list {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 0.85rem 1rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .sidebar-scrollable-list::-webkit-scrollbar {
      width: 6px;
    }
    .sidebar-scrollable-list::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }

    /* Branch List Card */
    .branch-list-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 0.95rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .branch-list-card:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
    }

    .branch-list-card.active {
      background: #f5f3ff;
      border-color: #8b5cf6;
      box-shadow: 0 4px 14px rgba(139, 92, 246, 0.15);
    }

    .branch-list-card.has-no-coords {
      opacity: 0.75;
      background: #fafafa;
    }

    .card-top-row {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .card-pin-box {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
      flex-shrink: 0;
    }

    .card-pin-box.no-pin {
      background: #fef2f2;
      border-color: #fecaca;
    }

    .card-title-block {
      flex: 1;
      min-width: 0;
    }

    .card-branch-name {
      font-size: 0.925rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.2rem;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
    }

    .card-branch-address {
      font-size: 0.775rem;
      color: #64748b;
      margin: 0;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
    }

    .card-details-arrow-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .card-details-arrow-btn:hover {
      background: #6366f1;
      color: #ffffff;
      border-color: #6366f1;
      transform: translateX(2px);
    }

    .card-bottom-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding-top: 0.45rem;
      border-top: 1px dashed #f1f5f9;
      font-size: 0.75rem;
      flex-wrap: wrap;
    }

    .card-phone {
      color: #475569;
      font-weight: 600;
    }

    .card-distance {
      color: #4f46e5;
      font-weight: 700;
      background: #eef2ff;
      padding: 0.15rem 0.45rem;
      border-radius: 6px;
    }

    .card-no-coords-tag {
      color: #dc2626;
      font-weight: 600;
      background: #fef2f2;
      padding: 0.15rem 0.45rem;
      border-radius: 6px;
      border: 1px solid #fecaca;
    }

    .card-view-hint {
      color: #6366f1;
      font-weight: 700;
      margin-left: auto;
    }

    /* Empty Sidebar State */
    .sidebar-empty-state {
      padding: 3rem 1.5rem;
      text-align: center;
      color: #64748b;
    }

    .empty-emoji {
      font-size: 2.5rem;
      display: block;
      margin-bottom: 0.75rem;
    }

    .empty-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.35rem;
    }

    .empty-desc {
      font-size: 0.825rem;
      margin: 0 0 1rem;
    }

    .empty-reset-btn {
      background: #eef2ff;
      color: #4f46e5;
      border: 1px solid #c7d2fe;
      border-radius: 8px;
      padding: 0.45rem 0.95rem;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
    }

    /* ========================================================
       3. SKELETON & ERROR STATES
       ======================================================== */
    .map-skeleton-container {
      flex: 1;
      min-height: 0;
      display: grid;
      grid-template-columns: 1fr 380px;
      height: 100%;
      overflow: hidden;
    }

    .skeleton-map-pane {
      height: 100%;
      background: #e2e8f0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }

    .skeleton-pulse-circle {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #cbd5e1;
      animation: pulse 1.5s infinite;
    }

    .skeleton-text {
      color: #64748b;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .skeleton-sidebar-pane {
      height: 100%;
      background: #ffffff;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      border-left: 1px solid #e2e8f0;
      overflow: hidden;
    }

    .skeleton-line {
      height: 20px;
      background: #f1f5f9;
      border-radius: 6px;
      animation: pulse 1.5s infinite;
    }
    .skeleton-line.title { width: 60%; }
    .skeleton-line.search { height: 38px; width: 100%; border-radius: 10px; }

    .skeleton-card {
      height: 80px;
      background: #f8fafc;
      border-radius: 12px;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }

    .map-error-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .error-card {
      background: #ffffff;
      border: 1px solid #fecaca;
      border-radius: 18px;
      padding: 2.5rem;
      text-align: center;
      max-width: 440px;
      box-shadow: 0 10px 25px -5px rgba(239, 68, 68, 0.08);
    }

    .error-icon {
      font-size: 3rem;
      display: block;
      margin-bottom: 0.75rem;
    }

    .error-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #991b1b;
      margin: 0 0 0.5rem;
    }

    .error-message {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0 0 1.25rem;
    }

    .retry-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #4f46e5;
      color: #ffffff;
      border: none;
      padding: 0.65rem 1.35rem;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .retry-btn:hover {
      background: #4338ca;
    }

    /* ========================================================
       4. MOBILE RESPONSIVENESS (<= 768px)
       ======================================================== */
    @media (max-width: 768px) {
      :host {
        height: auto;
        overflow: visible;
      }

      .map-page-wrapper {
        height: auto;
        overflow: visible;
      }

      .map-main-layout {
        display: flex;
        flex-direction: column;
        height: auto;
        overflow: visible;
      }

      .map-viewport-section {
        flex: none;
        height: 55dvh;
        min-height: 320px;
        width: 100%;
      }

      .branches-sidebar-panel {
        flex: none;
        width: 100%;
        max-width: 100%;
        height: auto;
        max-height: 45dvh;
        border-left: none;
        border-top: 1px solid #e2e8f0;
        overflow: hidden;
      }

      .sidebar-scrollable-list {
        flex: 1;
        min-height: 0;
        max-height: calc(45dvh - 120px);
        overflow-y: auto;
      }

      .topbar-actions {
        width: 100%;
        display: flex;
        gap: 0.5rem;
      }

      .topbar-btn {
        flex: 1;
        justify-content: center;
        min-height: 44px; /* Touch target minimum */
      }

      .card-details-arrow-btn {
        min-width: 44px;
        min-height: 44px;
        width: 44px;
        height: 44px; /* Touch target minimum */
      }

      .closest-branch-banner .banner-action-btn {
        min-height: 44px;
        padding: 0.5rem 1rem;
      }

      .coords-warning-banner .banner-close-btn,
      .closest-branch-banner .banner-close-btn {
        min-width: 44px;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .search-clear-btn {
        min-width: 44px;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .map-skeleton-container {
        display: flex;
        flex-direction: column;
        height: auto;
      }

      .skeleton-map-pane {
        height: 55dvh;
        min-height: 320px;
      }

      .skeleton-sidebar-pane {
        height: auto;
        border-left: none;
        border-top: 1px solid #e2e8f0;
      }
    }

    /* ========================================================
       5. DARK THEME STYLING (:host-context)
       ======================================================== */
    :host-context(body.dark-theme) .map-page-wrapper,
    :host-context(.dark-theme) .map-page-wrapper {
      background-color: #0b0f19;
    }

    :host-context(body.dark-theme) .map-topbar,
    :host-context(.dark-theme) .map-topbar {
      background: #151e32;
      border-bottom-color: #22304d;
    }

    :host-context(body.dark-theme) .topbar-title,
    :host-context(.dark-theme) .topbar-title {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .topbar-desc,
    :host-context(.dark-theme) .topbar-desc {
      color: #94a3b8;
    }

    :host-context(body.dark-theme) .topbar-btn,
    :host-context(.dark-theme) .topbar-btn {
      background: #0f172a;
      color: #cbd5e1;
      border-color: #334155;
    }

    :host-context(body.dark-theme) .topbar-btn:hover,
    :host-context(.dark-theme) .topbar-btn:hover {
      background: #1e293b;
      color: #f8fafc;
      border-color: #475569;
    }

    /* Warning banner in dark mode */
    :host-context(body.dark-theme) .coords-warning-banner,
    :host-context(.dark-theme) .coords-warning-banner {
      background: #451a03;
      border-bottom-color: #78350f;
    }

    :host-context(body.dark-theme) .coords-warning-banner .banner-text,
    :host-context(.dark-theme) .coords-warning-banner .banner-text {
      color: #fde68a;
    }

    :host-context(body.dark-theme) .coords-warning-banner .banner-close-btn,
    :host-context(.dark-theme) .coords-warning-banner .banner-close-btn {
      color: #fde68a;
    }

    :host-context(body.dark-theme) .coords-warning-banner .banner-close-btn:hover,
    :host-context(.dark-theme) .coords-warning-banner .banner-close-btn:hover {
      background: rgba(253, 230, 138, 0.15);
      color: #fef3c7;
    }

    /* Closest branch banner in dark mode */
    :host-context(body.dark-theme) .closest-branch-banner,
    :host-context(.dark-theme) .closest-branch-banner {
      background: #082f49;
      border-bottom-color: #0369a1;
    }

    :host-context(body.dark-theme) .closest-branch-banner .banner-text,
    :host-context(.dark-theme) .closest-branch-banner .banner-text {
      color: #e0f2fe;
    }

    :host-context(body.dark-theme) .closest-branch-banner .banner-text strong,
    :host-context(.dark-theme) .closest-branch-banner .banner-text strong {
      color: #38bdf8;
    }

    :host-context(body.dark-theme) .closest-branch-banner .banner-action-btn,
    :host-context(.dark-theme) .closest-branch-banner .banner-action-btn {
      background: #0284c7;
      color: #ffffff;
    }

    :host-context(body.dark-theme) .closest-branch-banner .banner-action-btn:hover,
    :host-context(.dark-theme) .closest-branch-banner .banner-action-btn:hover {
      background: #38bdf8;
      color: #0f172a;
    }

    :host-context(body.dark-theme) .closest-branch-banner .banner-close-btn,
    :host-context(.dark-theme) .closest-branch-banner .banner-close-btn {
      color: #bae6fd;
    }

    :host-context(body.dark-theme) .closest-branch-banner .banner-close-btn:hover,
    :host-context(.dark-theme) .closest-branch-banner .banner-close-btn:hover {
      background: rgba(186, 230, 253, 0.15);
      color: #f0f9ff;
    }

    :host-context(body.dark-theme) .map-viewport-section,
    :host-context(.dark-theme) .map-viewport-section {
      background: #0f172a;
    }

    :host-context(body.dark-theme) .branches-sidebar-panel,
    :host-context(.dark-theme) .branches-sidebar-panel {
      background: #151e32;
      border-left-color: #22304d;
      border-top-color: #22304d;
    }

    :host-context(body.dark-theme) .sidebar-header-box,
    :host-context(.dark-theme) .sidebar-header-box {
      background: #151e32;
      border-bottom-color: #22304d;
    }

    :host-context(body.dark-theme) .sidebar-title,
    :host-context(.dark-theme) .sidebar-title {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .sidebar-search-field,
    :host-context(.dark-theme) .sidebar-search-field {
      background: #0b0f19;
      border-color: #334155;
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .sidebar-search-field:focus,
    :host-context(.dark-theme) .sidebar-search-field:focus {
      border-color: #818cf8;
      background: #0f172a;
    }

    :host-context(body.dark-theme) .counter-badge,
    :host-context(.dark-theme) .counter-badge {
      background: #451a03;
      color: #fde68a;
      border-color: #78350f;
    }

    :host-context(body.dark-theme) .counter-badge.has-coords,
    :host-context(.dark-theme) .counter-badge.has-coords {
      background: #064e3b;
      color: #6ee7b7;
      border-color: #047857;
    }

    :host-context(body.dark-theme) .branch-list-card,
    :host-context(.dark-theme) .branch-list-card {
      background: #101726;
      border-color: #22304d;
    }

    :host-context(body.dark-theme) .branch-list-card:hover,
    :host-context(.dark-theme) .branch-list-card:hover {
      background: #19243d;
      border-color: #334a75;
    }

    :host-context(body.dark-theme) .branch-list-card.active,
    :host-context(.dark-theme) .branch-list-card.active {
      background: #1e1b4b;
      border-color: #818cf8;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.25);
    }

    :host-context(body.dark-theme) .branch-list-card.has-no-coords,
    :host-context(.dark-theme) .branch-list-card.has-no-coords {
      background: #0c121e;
      border-color: #1e293b;
    }

    :host-context(body.dark-theme) .card-branch-name,
    :host-context(.dark-theme) .card-branch-name {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .card-branch-address,
    :host-context(.dark-theme) .card-branch-address {
      color: #94a3b8;
    }

    :host-context(body.dark-theme) .card-pin-box,
    :host-context(.dark-theme) .card-pin-box {
      background: #1e293b;
      border-color: #334155;
    }

    :host-context(body.dark-theme) .card-pin-box.no-pin,
    :host-context(.dark-theme) .card-pin-box.no-pin {
      background: #450a0a;
      border-color: #7f1d1d;
    }

    :host-context(body.dark-theme) .card-details-arrow-btn,
    :host-context(.dark-theme) .card-details-arrow-btn {
      background: #1e293b;
      border-color: #334155;
      color: #cbd5e1;
    }

    :host-context(body.dark-theme) .card-details-arrow-btn:hover,
    :host-context(.dark-theme) .card-details-arrow-btn:hover {
      background: #6366f1;
      border-color: #6366f1;
      color: #ffffff;
    }

    :host-context(body.dark-theme) .card-bottom-row,
    :host-context(.dark-theme) .card-bottom-row {
      border-top-color: #22304d;
    }

    :host-context(body.dark-theme) .card-phone,
    :host-context(.dark-theme) .card-phone {
      color: #94a3b8;
    }

    :host-context(body.dark-theme) .card-distance,
    :host-context(.dark-theme) .card-distance {
      background: #1e1b4b;
      color: #a5b4fc;
    }

    :host-context(body.dark-theme) .card-no-coords-tag,
    :host-context(.dark-theme) .card-no-coords-tag {
      background: #450a0a;
      color: #fca5a5;
      border-color: #7f1d1d;
    }

    :host-context(body.dark-theme) .empty-title,
    :host-context(.dark-theme) .empty-title {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .no-coords-box,
    :host-context(.dark-theme) .no-coords-box {
      background: #151e32;
      border-color: #22304d;
    }

    :host-context(body.dark-theme) .no-coords-box h4,
    :host-context(.dark-theme) .no-coords-box h4 {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .error-card,
    :host-context(.dark-theme) .error-card {
      background: #151e32;
      border-color: #7f1d1d;
    }

    :host-context(body.dark-theme) .skeleton-map-pane,
    :host-context(.dark-theme) .skeleton-map-pane {
      background: #0f172a;
    }

    :host-context(body.dark-theme) .skeleton-sidebar-pane,
    :host-context(.dark-theme) .skeleton-sidebar-pane {
      background: #151e32;
      border-left-color: #22304d;
    }

    :host-context(body.dark-theme) .skeleton-line,
    :host-context(.dark-theme) .skeleton-line {
      background: #1e293b;
    }

    :host-context(body.dark-theme) .skeleton-card,
    :host-context(.dark-theme) .skeleton-card {
      background: #101726;
    }

    /* Global Leaflet Marker & Popup Custom Styles in component */
    :host ::ng-deep .custom-map-pin-wrapper {
      background: transparent;
      border: none;
    }

    :host ::ng-deep .custom-map-pin {
      position: relative;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.45);
      border: 2px solid #ffffff;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      cursor: pointer;
    }

    :host ::ng-deep .custom-map-pin:hover {
      transform: scale(1.15);
      box-shadow: 0 6px 18px rgba(79, 70, 229, 0.55);
    }

    :host ::ng-deep .custom-map-pin.active-pin {
      width: 42px;
      height: 42px;
      background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%);
      border: 3px solid #ffffff;
      box-shadow: 0 6px 20px rgba(244, 63, 94, 0.55);
      transform: scale(1.15);
      z-index: 9999 !important;
    }

    :host ::ng-deep .pin-inner {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    :host ::ng-deep .active-pin .pin-inner {
      font-size: 20px;
    }

    :host ::ng-deep .pin-pulse {
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      border: 2px solid rgba(244, 63, 94, 0.65);
      animation: pinPulseRing 1.8s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
      pointer-events: none;
    }

    @keyframes pinPulseRing {
      0% { transform: scale(0.9); opacity: 1; }
      100% { transform: scale(1.55); opacity: 0; }
    }

    /* Modern Leaflet Popup Styles */
    :host ::ng-deep .modern-leaflet-popup .leaflet-popup-content-wrapper {
      background: #ffffff;
      border-radius: 16px;
      padding: 0;
      box-shadow: 0 14px 35px rgba(15, 23, 42, 0.15);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }

    :host ::ng-deep .modern-leaflet-popup .leaflet-popup-content {
      margin: 0;
      line-height: normal;
    }

    :host ::ng-deep .modern-leaflet-popup .leaflet-popup-tip {
      background: #ffffff;
    }

    /* Popup Internal Card */
    :host ::ng-deep .leaflet-branch-popup-card {
      padding: 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    :host ::ng-deep .popup-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    :host ::ng-deep .popup-icon-badge {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
      flex-shrink: 0;
    }

    :host ::ng-deep .popup-title-box {
      flex: 1;
      min-width: 0;
    }

    :host ::ng-deep .popup-title {
      font-size: 0.95rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.15rem;
      line-height: 1.3;
    }

    :host ::ng-deep .popup-id-chip {
      font-size: 0.7rem;
      font-weight: 700;
      color: #64748b;
      background: #f1f5f9;
      padding: 0.15rem 0.45rem;
      border-radius: 6px;
    }

    :host ::ng-deep .popup-info-rows {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-size: 0.8rem;
    }

    :host ::ng-deep .popup-row {
      display: flex;
      align-items: flex-start;
      gap: 0.45rem;
      color: #475569;
      line-height: 1.35;
    }

    :host ::ng-deep .row-icon {
      flex-shrink: 0;
    }

    :host ::ng-deep .row-phone-link {
      color: #4f46e5;
      text-decoration: none;
      font-weight: 600;
    }

    :host ::ng-deep .row-phone-link:hover {
      text-decoration: underline;
    }

    :host ::ng-deep .popup-buttons {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid #f1f5f9;
    }

    :host ::ng-deep .popup-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      padding: 0.55rem 0.85rem;
      border-radius: 9px;
      font-size: 0.8rem;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      min-height: 38px;
    }

    :host ::ng-deep .btn-directions {
      background: #4f46e5;
      color: #ffffff !important;
    }

    :host ::ng-deep .btn-directions:hover {
      background: #4338ca;
    }

    :host ::ng-deep .btn-details {
      background: #f1f5f9;
      color: #334155 !important;
      border: 1px solid #cbd5e1;
    }

    :host ::ng-deep .btn-details:hover {
      background: #e2e8f0;
      color: #0f172a !important;
      border-color: #94a3b8;
    }

    /* Dark Mode Popups */
    :host-context(body.dark-theme) ::ng-deep .modern-leaflet-popup .leaflet-popup-content-wrapper,
    :host-context(.dark-theme) ::ng-deep .modern-leaflet-popup .leaflet-popup-content-wrapper {
      background: #151e32 !important;
      border-color: #22304d !important;
      box-shadow: 0 14px 35px rgba(0, 0, 0, 0.6) !important;
    }

    :host-context(body.dark-theme) ::ng-deep .modern-leaflet-popup .leaflet-popup-tip,
    :host-context(.dark-theme) ::ng-deep .modern-leaflet-popup .leaflet-popup-tip {
      background: #151e32 !important;
    }

    :host-context(body.dark-theme) ::ng-deep .popup-title,
    :host-context(.dark-theme) ::ng-deep .popup-title {
      color: #f8fafc !important;
    }

    :host-context(body.dark-theme) ::ng-deep .popup-row,
    :host-context(.dark-theme) ::ng-deep .popup-row {
      color: #cbd5e1 !important;
    }

    :host-context(body.dark-theme) ::ng-deep .popup-icon-badge,
    :host-context(.dark-theme) ::ng-deep .popup-icon-badge {
      background: #064e3b !important;
      border-color: #047857 !important;
    }

    :host-context(body.dark-theme) ::ng-deep .popup-buttons,
    :host-context(.dark-theme) ::ng-deep .popup-buttons {
      border-top-color: #22304d !important;
    }

    :host-context(body.dark-theme) ::ng-deep .btn-details,
    :host-context(.dark-theme) ::ng-deep .btn-details {
      background: #1e293b !important;
      color: #e2e8f0 !important;
      border-color: #334155 !important;
    }

    :host-context(body.dark-theme) ::ng-deep .btn-details:hover,
    :host-context(.dark-theme) ::ng-deep .btn-details:hover {
      background: #334155 !important;
      color: #ffffff !important;
    }
  `]
})
export class BranchesMapComponent implements OnInit, OnDestroy {
  private companyService = inject(CompanyService);
  private mapService = inject(MapService);
  themeService = inject(ThemeService);
  authState = inject(AuthStateService);
  private notification = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  branches: CompanyBranch[] = [];
  branchesWithCoords: (CompanyBranch & { distance?: number })[] = [];
  selectedBranch: CompanyBranch | null = null;
  searchQuery = '';
  isLoading = true;
  loadError: string | null = null;

  noCoordsWarning: string | null = null;
  private pendingTargetBranchId: number | null = null;
  private isMapReady = false;

  // Foydalanuvchi joylashuvi va geolokatsiya holatlari
  isLocating = false;
  closestBranchInfo: { name: string; distance: number; branch: CompanyBranch } | null = null;
  private userMarker?: L.Marker;
  private userCircle?: L.Circle;
  private resizeObserver?: ResizeObserver;
  private onWindowResize = () => {
    if (this.map) {
      this.map.invalidateSize();
    }
  };

  map?: L.Map;
  markers: Map<number, L.Marker> = new Map();
  userLocation?: MapLocation;

  constructor() {
    // Theme rejimiga mos tile layer yangilash (Light / Dark)
    effect(() => {
      const isDark = this.themeService.isDarkMode();
      if (this.map) {
        this.mapService.setTheme(this.map, isDark);
      }
    });

    // Query param ?branch=ID ni kuzatish
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const branchParam = params.get('branch');
      if (branchParam) {
        const branchId = Number(branchParam);
        if (!isNaN(branchId)) {
          this.handleBranchQueryParam(branchId);
        }
      }
    });
  }

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      document.body.classList.add('map-active-page');
    }
    this.loadBranches();
    this.setupPopupClickHandler();
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('map-active-page');
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onWindowResize);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.map) {
      this.map.remove();
    }
  }

  closeCoordsWarning(): void {
    this.noCoordsWarning = null;
    this.invalidateMapSizeDelayed();
  }

  closeClosestBranch(): void {
    this.closestBranchInfo = null;
    this.invalidateMapSizeDelayed();
  }

  private invalidateMapSizeDelayed(): void {
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 100);
  }

  /**
   * Foydalanuvchining filial tafsilotlarini ko'rish huquqi tekshiruvi:
   * - SuperAdmin: Barcha filiallar
   * - CompanyAdmin: Faqat o'z kompaniyasi filiallari
   * - BranchManager: Faqat o'z filiali
   * - Customer / Mehmon: UMUMAN KO'RMASIN
   */
  canViewBranchDetails(branch: CompanyBranch | null | undefined): boolean {
    return this.authState.canViewBranchDetails(branch);
  }

  /**
   * Koordinatalarni tekshirish, stringdan Number() ga o'tkazish,
   * teskari (lat > 50, lng < 50) kiritilgan bo'lsa to'g'rilash va chegaralarni tekshirish
   */
  getValidCoords(branch: CompanyBranch | null | undefined): { lat: number; lng: number } | null {
    if (!branch) return null;
    let lat = Number(branch.latitude);
    let lng = Number(branch.longitude);

    if ((isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) && branch.location) {
      const match = branch.location.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
      if (match) {
        lat = parseFloat(match[1]);
        lng = parseFloat(match[2]);
      }
    }

    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
      return null;
    }

    // O'zbekiston hududida lat ~37-45, lng ~56-74 oralig'ida bo'ladi.
    // Agar lat > 50 va lng < 50 bo'lsa, demak koordinatalar teskari (lng, lat) kiritilgan.
    if (lat > 50 && lng < 50) {
      const temp = lat;
      lat = lng;
      lng = temp;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }

    return { lat, lng };
  }

  hasCoords(branch: CompanyBranch | null | undefined): boolean {
    return this.getValidCoords(branch) !== null;
  }

  private normalizeBranch(b: CompanyBranch): CompanyBranch {
    const coords = this.getValidCoords(b);
    return {
      ...b,
      latitude: coords ? coords.lat : undefined,
      longitude: coords ? coords.lng : undefined
    };
  }

  get filteredAllBranches(): (CompanyBranch & { distance?: number })[] {
    const q = this.searchQuery.trim().toLowerCase();
    let baseList = this.branches;

    if (q) {
      baseList = this.branches.filter(
        b => b.name.toLowerCase().includes(q) || (b.address && b.address.toLowerCase().includes(q))
      );
    }

    // Koordinatali filiallar oldinda, koordinatasizlar pastda
    return [
      ...baseList.filter(b => this.hasCoords(b)),
      ...baseList.filter(b => !this.hasCoords(b))
    ];
  }

  loadBranches(): void {
    this.isLoading = true;
    this.loadError = null;

    this.companyService.getAllBranches().subscribe({
      next: (branches) => {
        const normalized = (branches || []).map(b => this.normalizeBranch(b));
        this.branches = normalized;
        this.branchesWithCoords = normalized.filter(b => this.hasCoords(b));
        this.isLoading = false;

        // Xaritani DOM render bo'lgach ishga tushirish
        setTimeout(() => {
          this.initMap();
          this.isMapReady = true;

          // Agar query param orqali filial oldinroq kelgan bo'lsa
          if (this.pendingTargetBranchId !== null) {
            this.focusBranchById(this.pendingTargetBranchId);
          }
        }, 120);
      },
      error: (err) => {
        console.error('[BranchesMap] Xatolik:', err);
        this.loadError = "Filiallar roʻyxatini yuklashda server bilan bogʻlanish xatosi yuz berdi.";
        this.isLoading = false;
      }
    });
  }

  private handleBranchQueryParam(branchId: number): void {
    if (this.isMapReady && this.branches.length > 0) {
      this.focusBranchById(branchId);
    } else {
      this.pendingTargetBranchId = branchId;
    }
  }

  private focusBranchById(branchId: number): void {
    const branch = this.branches.find(b => b.id === branchId);
    if (!branch) {
      this.noCoordsWarning = `ID #${branchId} boʻyicha filial topilmadi`;
      return;
    }

    if (!this.hasCoords(branch)) {
      this.selectedBranch = branch;
      this.noCoordsWarning = `"${branch.name}" filiali uchun koordinata kiritilmagan`;
      this.scrollBranchIntoView(branch.id);
      return;
    }

    this.noCoordsWarning = null;
    this.selectBranch(branch, false);
    this.scrollBranchIntoView(branch.id);
  }

  private scrollBranchIntoView(branchId: number): void {
    setTimeout(() => {
      const el = document.getElementById('branch-item-' + branchId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 150);
  }

  /**
   * "Mening joyim": navigator.geolocation.getCurrentPosition (highAccuracy, 10s timeout, maxAge 0)
   * Alohida ko'k marker, aniqlik doirasi (L.circle), flyTo(..., 16) va "Siz shu yerdasiz" popup'i.
   */
  locateUser(): void {
    if (!this.map) return;

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.notification.error("Brauzeringiz geolokatsiyani qoʻllab-quvvatlamaydi.", "Xatolik");
      return;
    }

    this.isLocating = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.isLocating = false;
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy || 20;

        this.userLocation = { latitude: lat, longitude: lng };

        // 1. Eski "mening joyim" marker va doirasini tozalash (takrorlanmasin)
        if (this.userMarker && this.map) {
          this.map.removeLayer(this.userMarker);
          this.userMarker = undefined;
        }
        if (this.userCircle && this.map) {
          this.map.removeLayer(this.userCircle);
          this.userCircle = undefined;
        }

        // 2. Yangi aniqlik doirasi (L.circle, radius = coords.accuracy)
        this.userCircle = L.circle([lat, lng], {
          radius: Math.max(accuracy, 15),
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          weight: 2
        }).addTo(this.map!);

        // 3. Foydalanuvchi joyida alohida marker (ko'k nuqta, filial markerlaridan farqli)
        const userIcon = L.divIcon({
          html: `
            <div class="user-map-pin" style="position: relative; width: 22px; height: 22px; border-radius: 50%; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 0 12px rgba(37, 99, 235, 0.75);">
              <div class="user-pin-pulse" style="position: absolute; inset: -8px; border-radius: 50%; background: rgba(37, 99, 235, 0.35); animation: userPulseRing 2s infinite ease-out;"></div>
            </div>
          `,
          className: 'user-map-pin-container',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          popupAnchor: [0, -14]
        });

        this.userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 2000 })
          .addTo(this.map!)
          .bindPopup(`
            <div style="font-weight: 700; font-size: 0.9rem; color: #0f172a; padding: 4px 6px; text-align: center;">
              📍 Siz shu yerdasiz
              <div style="font-size: 0.75rem; color: #64748b; font-weight: 500; margin-top: 3px;">
                Aniqlik: &plusmn;${Math.round(accuracy)} metr
              </div>
            </div>
          `, { className: 'modern-leaflet-popup' });

        // 4. Invalidate size va flyTo(..., 16, { duration: 0.8 })
        this.map!.invalidateSize();
        this.map!.flyTo([lat, lng], 16, { animate: true, duration: 0.8 });
        this.map!.once('moveend', () => {
          this.userMarker?.openPopup();
        });

        // 5. Eng yaqin filialni hisoblab ko'rsatish
        this.calculateDistances();
        const closest = this.findClosestBranch(lat, lng);
        if (closest) {
          this.closestBranchInfo = {
            name: closest.branch.name,
            distance: closest.distance,
            branch: closest.branch
          };
          this.invalidateMapSizeDelayed();
          this.notification.info(
            `Eng yaqin filial: ${closest.branch.name} (${closest.distance} km)`,
            "Joylashuv aniqlandi"
          );
          this.scrollBranchIntoView(closest.branch.id);
        } else {
          this.notification.success("Joylashuvingiz xaritada koʻrsatildi.", "Muvaffaqiyatli");
        }
      },
      (error) => {
        this.isLocating = false;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.notification.warning(
              "Joylashuvga ruxsat bering: brauzer manzil qatoridagi qulf belgisi orqali ruxsat bering.",
              "Ruxsat berilmagan"
            );
            break;
          case error.POSITION_UNAVAILABLE:
            this.notification.error("Joylashuvingizni aniqlab boʻlmadi.", "Joylashuv aniqlanmadi");
            break;
          case error.TIMEOUT:
            this.notification.error("Joylashuvni aniqlash vaqti tugadi. Qayta urinib koʻring.", "Vaqt tugadi");
            break;
          default:
            this.notification.error("Joylashuvni aniqlashda xatolik yuz berdi.", "Xatolik");
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  goToClosestBranch(): void {
    if (this.closestBranchInfo?.branch) {
      this.selectBranch(this.closestBranchInfo.branch, true);
      this.scrollBranchIntoView(this.closestBranchInfo.branch.id);
    }
  }

  private findClosestBranch(userLat: number, userLng: number): { branch: CompanyBranch; distance: number } | null {
    if (this.branchesWithCoords.length === 0) return null;

    let closest: CompanyBranch | null = null;
    let minDistance = Infinity;

    for (const b of this.branchesWithCoords) {
      const coords = this.getValidCoords(b);
      if (!coords) continue;

      const d = this.mapService.calculateDistance(
        { latitude: userLat, longitude: userLng },
        { latitude: coords.lat, longitude: coords.lng }
      );

      if (d < minDistance) {
        minDistance = d;
        closest = b;
      }
    }

    return closest ? { branch: closest, distance: minDistance } : null;
  }

  private calculateDistances(): void {
    if (!this.userLocation) return;

    this.branchesWithCoords = this.branchesWithCoords.map(branch => {
      const coords = this.getValidCoords(branch);
      return {
        ...branch,
        distance: coords
          ? this.mapService.calculateDistance(this.userLocation!, {
              latitude: coords.lat,
              longitude: coords.lng
            })
          : undefined
      };
    }).sort((a, b) => (a.distance || 999) - (b.distance || 999));
  }

  fitAllBranches(): void {
    if (!this.map) return;

    const validLocations = this.branchesWithCoords
      .map(b => this.getValidCoords(b))
      .filter((c): c is { lat: number; lng: number } => c !== null)
      .map(c => ({ latitude: c.lat, longitude: c.lng }));

    if (validLocations.length === 0) {
      this.map.setView([this.mapService.defaultCenter.latitude, this.mapService.defaultCenter.longitude], 12);
      return;
    }

    this.map.invalidateSize();
    this.mapService.fitBounds(this.map, validLocations);
  }

  private initMap(): void {
    const mapContainer = document.getElementById('branches-map');
    if (!mapContainer) return;

    const isDark = this.themeService.isDarkMode();
    this.map = this.mapService.createMap('branches-map', this.mapService.defaultCenter, 12, isDark);

    // Markerlarni xaritaga joylashtirish
    this.branchesWithCoords.forEach(branch => {
      const coords = this.getValidCoords(branch);
      if (!coords) return;

      const canView = this.canViewBranchDetails(branch);
      const marker = this.mapService.addBranchMarker(
        this.map!,
        { ...branch, latitude: coords.lat, longitude: coords.lng },
        canView,
        () => this.selectBranch(branch, true)
      );
      this.markers.set(branch.id, marker);
    });

    // Boshlang'ich ko'rinish
    if (this.pendingTargetBranchId !== null) {
      this.focusBranchById(this.pendingTargetBranchId);
    } else if (this.branchesWithCoords.length > 0) {
      this.fitAllBranches();
    } else {
      this.map.setView([this.mapService.defaultCenter.latitude, this.mapService.defaultCenter.longitude], 12);
    }

    // ResizeObserver va window resize orqali xarita o'lchamini doimiy to'g'ri ushlash
    if (typeof ResizeObserver !== 'undefined') {
      let resizeTimer: any = null;
      this.resizeObserver = new ResizeObserver(() => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
          }
        }, 80);
      });
      this.resizeObserver.observe(mapContainer);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.onWindowResize);
    }

    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 100);

    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 300);
  }

  selectBranch(branch: CompanyBranch, updateUrl = true): void {
    const coords = this.getValidCoords(branch);

    if (!coords) {
      this.selectedBranch = branch;
      this.noCoordsWarning = `"${branch.name}" filiali uchun koordinata kiritilmagan`;
      this.notification.warning("Bu filial uchun koordinata kiritilmagan", "Koordinata yoʻq");
      if (updateUrl) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { branch: branch.id },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }
      return;
    }

    this.noCoordsWarning = null;

    // Oldingi marker ikonkasini normal holatga qaytarish
    if (this.selectedBranch && this.selectedBranch.id !== branch.id && this.markers.has(this.selectedBranch.id)) {
      const prevMarker = this.markers.get(this.selectedBranch.id)!;
      prevMarker.setIcon(this.mapService.createBranchPin(false));
      prevMarker.setZIndexOffset(0);
    }

    this.selectedBranch = branch;

    // Tanlangan filial markerini kattalashtirish va ajratib ko'rsatish
    const marker = this.markers.get(branch.id);
    if (marker) {
      marker.setIcon(this.mapService.createBranchPin(true));
      marker.setZIndexOffset(1000);
    }

    if (updateUrl) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { branch: branch.id },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }

    if (this.map) {
      // Invalidate size before flyTo
      this.map.invalidateSize();

      this.map.flyTo([coords.lat, coords.lng], 16, {
        animate: true,
        duration: 0.8
      });

      // Yagona Leaflet popup ochish - faqat harakat tugagach (moveend) ochiladi
      this.map.once('moveend', () => {
        if (marker) {
          marker.openPopup();
        }
      });
    }
  }

  private setupPopupClickHandler(): void {
    // Leaflet popup ichidagi "Batafsil ko'rish" tugmasini hodisasini tutish
    document.addEventListener('click', (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest('.leaflet-popup-branch-link');
      if (target) {
        event.preventDefault();
        const branchId = target.getAttribute('data-branch-id');
        if (branchId) {
          this.router.navigate(['/branches', branchId]);
        }
      }
    });
  }
}
