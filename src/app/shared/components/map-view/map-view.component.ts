import { Component, Input, OnInit, OnDestroy, AfterViewInit, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import * as L from 'leaflet';
import { MapService, MapLocation } from '../../../core/services/map.service';
import { CompanyBranch } from '../../../core/models/company-branch.model';

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="map-container" [style.height]="height">
      <div [id]="mapId" class="map-element"></div>

      <!-- Yuklanmoqda holati -->
      <div class="map-loading" *ngIf="isLoading">
        <div class="loading-spinner"></div>
        <span>Xarita yuklanmoqda...</span>
      </div>

      <!-- Xarita bo'sh holati -->
      <div class="map-empty" *ngIf="!isLoading && branches.length === 0 && showEmptyState">
        <span class="empty-icon">🗺️</span>
        <p>Lokatsiyali filiallar topilmadi</p>
      </div>
    </div>
  `,
  styles: [`
    .map-container {
      position: relative;
      width: 100%;
      border-radius: 12px;
      overflow: hidden;
      background: #f1f5f9;
    }

    .map-element {
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    .map-loading,
    .map-empty {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(241, 245, 249, 0.95);
      z-index: 10;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e2e8f0;
      border-top-color: #4f46e5;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 12px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .map-loading span,
    .map-empty p {
      color: #64748b;
      font-size: 0.9rem;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 8px;
    }

    .map-empty p {
      margin: 0;
    }

    /* Leaflet popup stillar */
    :host ::ng-deep .leaflet-popup-content-wrapper {
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
    }

    :host ::ng-deep .leaflet-popup-content {
      margin: 12px 14px;
    }
  `]
})
export class MapViewComponent implements OnInit, AfterViewInit, OnDestroy {
  private mapService = inject(MapService);

  @Input() branches: CompanyBranch[] = [];
  @Input() height = '400px';
  @Input() showEmptyState = true;
  @Input() singleBranch = false; // Bitta filial uchun (branch-detail)
  @Input() centerLat?: number;
  @Input() centerLng?: number;

  @Output() branchClick = new EventEmitter<CompanyBranch>();

  mapId = 'map-' + Math.random().toString(36).substring(2, 9);
  map?: L.Map;
  markers: L.Marker[] = [];
  isLoading = true;

  ngOnInit(): void {
    // Initialization in ngAfterViewInit
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 100);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    const center: MapLocation = this.centerLat && this.centerLng
      ? { latitude: this.centerLat, longitude: this.centerLng }
      : this.mapService.defaultCenter;

    this.map = this.mapService.createMap(this.mapId, center, this.singleBranch ? 15 : 12);

    this.addBranchMarkers();
    this.isLoading = false;
  }

  private addBranchMarkers(): void {
    if (!this.map) return;

    // Mavjud markerlarni tozalash
    this.markers.forEach(m => m.remove());
    this.markers = [];

    // Faqat koordinatalari bor filiallar
    const branchesWithCoords = this.branches.filter(
      b => b.latitude && b.longitude
    );

    branchesWithCoords.forEach(branch => {
      const location: MapLocation = {
        latitude: branch.latitude!,
        longitude: branch.longitude!
      };

      const marker = this.mapService.addBranchMarker(
        this.map!,
        location,
        branch.name,
        branch.address,
        () => this.branchClick.emit(branch)
      );

      this.markers.push(marker);
    });

    // Agar 1 dan ortiq marker bo'lsa, hammasini ko'rsatish
    if (!this.singleBranch && branchesWithCoords.length > 1) {
      this.mapService.fitBounds(
        this.map,
        branchesWithCoords.map(b => ({
          latitude: b.latitude!,
          longitude: b.longitude!
        }))
      );
    } else if (branchesWithCoords.length === 1) {
      // Bitta marker bo'lsa, unga zoom qilish
      this.mapService.centerMap(this.map, {
        latitude: branchesWithCoords[0].latitude!,
        longitude: branchesWithCoords[0].longitude!
      });
    }
  }

  /**
   * Tashqi fayldan markerlarni yangilash uchun
   */
  refreshMarkers(): void {
    this.addBranchMarkers();
  }
}
