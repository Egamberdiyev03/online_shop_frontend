import { Injectable } from '@angular/core';
import * as L from 'leaflet';

// Leaflet marker icon fix (CDN orqali)
const iconRetinaUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png';
const iconUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png';
const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';

L.Marker.prototype.options.icon = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

export interface MapLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MapService {
  // Toshkent markazi (standart)
  readonly defaultCenter: MapLocation = {
    latitude: 41.2995,
    longitude: 69.2401,
    address: "Toshkent, O'zbekiston"
  };

  readonly defaultZoom = 12;
  readonly markerZoom = 15;

  private currentTileLayer?: L.TileLayer;

  // OpenStreetMap - mutlaqo bepul, hech qanday API kalit talab qilmaydi
  readonly osmTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  /**
   * Xarita yaratish (OpenStreetMap bilan)
   */
  createMap(elementId: string, center?: MapLocation, zoom?: number, isDark = false): L.Map {
    const loc = center || this.defaultCenter;
    const z = zoom || this.defaultZoom;

    const map = L.map(elementId, {
      zoomControl: true,
      attributionControl: true
    }).setView([loc.latitude, loc.longitude], z);

    // Ishonchli, bepul OpenStreetMap qatlami
    this.currentTileLayer = L.tileLayer(this.osmTileUrl, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    this.setTheme(map, isDark);

    return map;
  }

  /**
   * Tun yoki Kun rejimini boshqarish (CSS filter orqali, API kalit talab qilmaydi)
   */
  setTheme(map: L.Map, isDark: boolean): void {
    const container = map.getContainer();
    if (container) {
      if (isDark) {
        container.classList.add('dark-tiles-mode');
      } else {
        container.classList.remove('dark-tiles-mode');
      }
    }
  }

  /**
   * Zamonaviy yumaloq pin (DivIcon) yaratish (inline styles bilan mustahkam)
   */
  createBranchPin(isSelected: boolean = false): L.DivIcon {
    const size = isSelected ? 42 : 34;
    const bg = isSelected
      ? 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)'
      : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';
    const border = isSelected ? '3px solid #ffffff' : '2px solid #ffffff';
    const shadow = isSelected ? '0 6px 20px rgba(244, 63, 94, 0.6)' : '0 4px 14px rgba(79, 70, 229, 0.45)';
    const fontSize = isSelected ? '20px' : '16px';
    const pulseHtml = isSelected
      ? '<div class="pin-pulse" style="position: absolute; inset: -6px; border-radius: 50%; border: 2px solid rgba(244, 63, 94, 0.65); animation: pinPulseRing 1.8s infinite cubic-bezier(0.215, 0.61, 0.355, 1); pointer-events: none;"></div>'
      : '';

    const html = `
      <div class="custom-map-pin ${isSelected ? 'active-pin' : ''}" style="position: relative; width: ${size}px; height: ${size}px; border-radius: 50%; background: ${bg}; display: flex; align-items: center; justify-content: center; box-shadow: ${shadow}; border: ${border}; cursor: pointer; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);">
        <div class="pin-inner" style="display: flex; align-items: center; justify-content: center; font-size: ${fontSize}; line-height: 1;">
          <span class="pin-icon">🏬</span>
        </div>
        ${pulseHtml}
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-map-pin-wrapper',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2 - 6]
    });
  }

  /**
   * Filial uchun zamonaviy yagona Leaflet Popup HTML
   */
  createBranchPopupHtml(branch: any, canViewDetails: boolean): string {
    const lat = Number(branch.latitude);
    const lng = Number(branch.longitude);
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    const locationNote = branch.location && !branch.location.match(/^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/)
      ? this.escapeHtml(branch.location)
      : null;

    const safeName = this.escapeHtml(branch.name || '');
    const safeAddress = this.escapeHtml(branch.address || '');
    const safePhone = branch.phoneNumber ? this.escapeHtml(branch.phoneNumber) : '';

    return `
      <div class="leaflet-branch-popup-card">
        <div class="popup-header">
          <div class="popup-icon-badge">🏬</div>
          <div class="popup-title-box">
            <h4 class="popup-title">${safeName}</h4>
            <span class="popup-id-chip">#${branch.id}</span>
          </div>
        </div>

        <div class="popup-info-rows">
          <div class="popup-row">
            <span class="row-icon">📍</span>
            <span class="row-text">${safeAddress}</span>
          </div>
          ${safePhone ? `
            <div class="popup-row">
              <span class="row-icon">📞</span>
              <a href="tel:${safePhone}" class="row-phone-link">${safePhone}</a>
            </div>
          ` : ''}
          ${locationNote ? `
            <div class="popup-row note-row">
              <span class="row-icon">🌐</span>
              <span class="row-text">${locationNote}</span>
            </div>
          ` : ''}
        </div>

        <div class="popup-buttons">
          <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" class="popup-btn btn-directions">
            <span>🧭</span> Yoʻnalish olish
          </a>
          ${canViewDetails ? `
            <button type="button" class="popup-btn btn-details leaflet-popup-branch-link" data-branch-id="${branch.id}">
              Batafsil koʻrish &rarr;
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Filial uchun marker qo'shish (zamonaviy DivIcon va yagona popup bilan)
   */
  addBranchMarker(
    map: L.Map,
    branchOrLocation: any,
    nameOrCanView?: string | boolean,
    addressOrClick?: string | (() => void),
    maybeClick?: () => void
  ): L.Marker {
    let lat: number;
    let lng: number;
    let branchObj: any;
    let canViewDetails = false;
    let onClick: (() => void) | undefined;

    if (typeof nameOrCanView === 'string') {
      // Eskicha shakl: (map, location, name, address, onClick)
      lat = Number(branchOrLocation.latitude);
      lng = Number(branchOrLocation.longitude);
      branchObj = {
        name: nameOrCanView,
        address: typeof addressOrClick === 'string' ? addressOrClick : '',
        latitude: lat,
        longitude: lng,
        id: branchOrLocation.id || 0
      };
      canViewDetails = false;
      onClick = maybeClick;
    } else {
      // Yangicha shakl: (map, branch, canViewDetails, onClick)
      branchObj = branchOrLocation;
      lat = Number(branchObj.latitude);
      lng = Number(branchObj.longitude);
      canViewDetails = !!nameOrCanView;
      onClick = typeof addressOrClick === 'function' ? (addressOrClick as () => void) : maybeClick;
    }

    const pinIcon = this.createBranchPin(false);
    const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(map);

    const popupHtml = this.createBranchPopupHtml(branchObj, canViewDetails);
    marker.bindPopup(popupHtml, {
      maxWidth: 320,
      minWidth: 260,
      className: 'modern-leaflet-popup'
    });

    if (onClick) {
      marker.on('click', onClick);
    }

    return marker;
  }

  /**
   * Yetkazish joyi uchun maxsus marker (qizil)
   */
  createDeliveryIcon(): L.Icon {
    return L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  }

  /**
   * Xaritani markazlashtirish
   */
  centerMap(map: L.Map, location: MapLocation, zoom?: number): void {
    map.setView([location.latitude, location.longitude], zoom || this.markerZoom);
  }

  /**
   * Foydalanuvchi joylashuvini olish (Geolocation API)
   */
  getCurrentLocation(): Promise<MapLocation> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation qo'llab-quvvatlanmaydi"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation xatosi:', error.message);
          resolve(this.defaultCenter);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 daqiqa cache
        }
      );
    });
  }

  /**
   * Ikki nuqta orasidagi masofani hisoblash (km)
   */
  calculateDistance(loc1: MapLocation, loc2: MapLocation): number {
    const R = 6371; // Yer radiusi (km)
    const dLat = this.toRad(loc2.latitude - loc1.latitude);
    const dLon = this.toRad(loc2.longitude - loc1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(loc1.latitude)) *
        Math.cos(this.toRad(loc2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Barcha markerlarni ko'rsatadigan bounds
   */
  fitBounds(map: L.Map, locations: MapLocation[]): void {
    if (locations.length === 0) return;

    const bounds = L.latLngBounds(
      locations.map(loc => [loc.latitude, loc.longitude] as [number, number])
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }
}
