import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { MapService, MapLocation } from '../../../core/services/map.service';

export interface SelectedLocation {
  latitude: number;
  longitude: number;
  address: string;
}

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="location-picker">
      <!-- Header -->
      <div class="picker-header">
        <h3 class="picker-title">Yetkazib berish manzili</h3>
        <p class="picker-subtitle">Xaritada joylashuvingizni belgilang</p>
      </div>

      <!-- Manzil input -->
      <div class="address-input-row">
        <div class="input-wrapper">
          <span class="input-icon">📍</span>
          <input
            type="text"
            [(ngModel)]="addressText"
            placeholder="Manzilni kiriting (ko'cha, uy raqami)"
            class="address-input"
          />
        </div>
        <button
          type="button"
          class="my-location-btn"
          (click)="useMyLocation()"
          [disabled]="isLocating"
          title="Mening joylashuvim"
        >
          <span *ngIf="!isLocating">📍</span>
          <span *ngIf="isLocating" class="locating-spinner"></span>
        </button>
      </div>

      <!-- Xarita -->
      <div class="map-wrapper">
        <div [id]="mapId" class="picker-map"></div>

        <!-- Xarita ustidagi ko'rsatma -->
        <div class="map-hint" *ngIf="!selectedLocation">
          <span>Xaritada joy tanlash uchun bosing</span>
        </div>
      </div>

      <!-- Tanlangan joy info -->
      <div class="selected-info" *ngIf="selectedLocation">
        <div class="info-icon">✅</div>
        <div class="info-content">
          <span class="info-label">Tanlangan joy:</span>
          <span class="info-coords">
            {{ selectedLocation.latitude.toFixed(6) }}, {{ selectedLocation.longitude.toFixed(6) }}
          </span>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="picker-actions">
        <button type="button" class="btn btn-secondary" (click)="onCancel()">
          Bekor qilish
        </button>
        <button
          type="button"
          class="btn btn-primary"
          [disabled]="!selectedLocation || !addressText.trim()"
          (click)="onConfirm()"
        >
          Tasdiqlash
        </button>
      </div>
    </div>
  `,
  styles: [`
    .location-picker {
      background: #ffffff;
      border-radius: 16px;
      padding: 1.5rem;
      max-width: 600px;
      margin: 0 auto;
    }

    .picker-header {
      margin-bottom: 1.25rem;
    }

    .picker-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.25rem;
    }

    .picker-subtitle {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
    }

    .address-input-row {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .input-wrapper {
      flex: 1;
      position: relative;
    }

    .input-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 1rem;
    }

    .address-input {
      width: 100%;
      padding: 0.75rem 1rem 0.75rem 2.5rem;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-size: 0.95rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .address-input:focus {
      outline: none;
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }

    .my-location-btn {
      width: 48px;
      height: 48px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #f8fafc;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      transition: all 0.2s;
    }

    .my-location-btn:hover:not(:disabled) {
      background: #eef2ff;
      border-color: #4f46e5;
    }

    .my-location-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .locating-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #e2e8f0;
      border-top-color: #4f46e5;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .map-wrapper {
      position: relative;
      height: 300px;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 1rem;
    }

    .picker-map {
      width: 100%;
      height: 100%;
    }

    .map-hint {
      position: absolute;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.85);
      color: #ffffff;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.8rem;
      z-index: 1000;
      pointer-events: none;
    }

    .selected-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 10px;
      margin-bottom: 1.25rem;
    }

    .info-icon {
      font-size: 1.25rem;
    }

    .info-content {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .info-label {
      font-size: 0.75rem;
      color: #059669;
      font-weight: 600;
    }

    .info-coords {
      font-size: 0.8rem;
      color: #064e3b;
      font-family: monospace;
    }

    .picker-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .btn {
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
    }

    .btn-secondary:hover {
      background: #e2e8f0;
    }

    .btn-primary {
      background: #4f46e5;
      color: #ffffff;
    }

    .btn-primary:hover:not(:disabled) {
      background: #4338ca;
    }

    .btn-primary:disabled {
      background: #c7d2fe;
      cursor: not-allowed;
    }
  `]
})
export class LocationPickerComponent implements OnInit, AfterViewInit, OnDestroy {
  private mapService = inject(MapService);

  @Input() initialLocation?: MapLocation;
  @Input() initialAddress?: string;

  @Output() locationSelected = new EventEmitter<SelectedLocation>();
  @Output() cancelled = new EventEmitter<void>();

  mapId = 'picker-' + Math.random().toString(36).substring(2, 9);
  map?: L.Map;
  marker?: L.Marker;

  addressText = '';
  selectedLocation?: MapLocation;
  isLocating = false;

  ngOnInit(): void {
    if (this.initialAddress) {
      this.addressText = this.initialAddress;
    }
    if (this.initialLocation) {
      this.selectedLocation = this.initialLocation;
    }
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
    const center = this.initialLocation || this.mapService.defaultCenter;
    this.map = this.mapService.createMap(this.mapId, center, 14);

    // Xaritaga click listener
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.setMarker(e.latlng.lat, e.latlng.lng);
    });

    // Agar boshlang'ich joy bo'lsa, marker qo'yish
    if (this.initialLocation) {
      this.setMarker(this.initialLocation.latitude, this.initialLocation.longitude);
    }
  }

  private setMarker(lat: number, lng: number): void {
    if (!this.map) return;

    // Mavjud markerni o'chirish
    if (this.marker) {
      this.marker.remove();
    }

    // Yangi marker qo'shish (qizil icon)
    const deliveryIcon = this.mapService.createDeliveryIcon();
    this.marker = L.marker([lat, lng], { icon: deliveryIcon }).addTo(this.map);

    this.selectedLocation = { latitude: lat, longitude: lng };

    // Markerni draggable qilish
    this.marker.dragging?.enable();
    this.marker.on('dragend', () => {
      const pos = this.marker!.getLatLng();
      this.selectedLocation = { latitude: pos.lat, longitude: pos.lng };
    });
  }

  async useMyLocation(): Promise<void> {
    this.isLocating = true;
    try {
      const location = await this.mapService.getCurrentLocation();
      this.setMarker(location.latitude, location.longitude);
      this.mapService.centerMap(this.map!, location, 16);
    } catch (error) {
      console.error('Joylashuvni olishda xatolik:', error);
    } finally {
      this.isLocating = false;
    }
  }

  onConfirm(): void {
    if (this.selectedLocation && this.addressText.trim()) {
      this.locationSelected.emit({
        latitude: this.selectedLocation.latitude,
        longitude: this.selectedLocation.longitude,
        address: this.addressText.trim()
      });
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
