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

export interface RouteEstimate {
  distanceKm: number;
  minMinutes: number;
  maxMinutes: number;
  isRoadRoute: boolean;
  geometry: [number, number][];
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

  escapeHtml(str: string): string {
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

  isValidCoord(lat?: number | null, lng?: number | null): boolean {
    if (lat == null || lng == null) return false;
    const nLat = Number(lat);
    const nLng = Number(lng);
    return !isNaN(nLat) && !isNaN(nLng) && !(nLat === 0 && nLng === 0);
  }

  extractBranchLocation(branch?: { latitude?: number; longitude?: number; location?: string; address?: string } | null): MapLocation | null {
    if (!branch) return null;
    let lat = branch.latitude != null ? Number(branch.latitude) : NaN;
    let lng = branch.longitude != null ? Number(branch.longitude) : NaN;
    if ((isNaN(lat) || isNaN(lng)) && branch.location) {
      const match = branch.location.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
      if (match) {
        lat = parseFloat(match[1]);
        lng = parseFloat(match[2]);
      }
    }
    return this.isValidCoord(lat, lng) ? { latitude: lat, longitude: lng, address: branch.address } : null;
  }

  createEmojiPin(emoji: string, bg: string): L.DivIcon {
    return L.divIcon({
      html: `<div style="width:36px;height:36px;border-radius:50%;background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;border:2.5px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.3);">${emoji}</div>`,
      className: 'track-custom-pin',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20]
    });
  }

  getDirectionsUrl(origin?: MapLocation | null, dest?: MapLocation | null): string | null {
    if (origin && dest && (origin.latitude !== dest.latitude || origin.longitude !== dest.longitude)) {
      return `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${dest.latitude},${dest.longitude}`;
    }
    const single = dest || origin;
    return single ? `https://www.google.com/maps?q=${single.latitude},${single.longitude}` : null;
  }

  getVehicleSpeedKmh(vehicleType?: number | string): number {
    const key = typeof vehicleType === 'string' ? vehicleType.trim().toLowerCase() : vehicleType;
    if (key === 0 || key === 'foot') return 4.8;
    if (key === 3 || key === 'bicycle') return 15;
    if (key === 2 || key === 'motorcycle') return 32;
    if (key === 1 || key === 'car') return 28;
    return 25;
  }

  private buildEtaRange(rawMinutes: number, includePickupBuffer: boolean): { minMinutes: number; maxMinutes: number } {
    const buffer = includePickupBuffer ? 5 : 0;
    const total = rawMinutes + buffer;
    const minMinutes = Math.max(2, Math.round(total * 0.9));
    const maxMinutes = Math.max(minMinutes + 2, Math.round(total * 1.2 + 2));
    return { minMinutes, maxMinutes };
  }

  private buildFallbackRoute(
    points: MapLocation[],
    vehicleType?: number | string,
    includePickupBuffer = false
  ): RouteEstimate {
    let straightKm = 0;
    for (let i = 0; i < points.length - 1; i++) {
      straightKm += this.calculateDistance(points[i], points[i + 1]);
    }
    const distanceKm = Math.round(straightKm * 1.35 * 10) / 10;
    const speedKmh = this.getVehicleSpeedKmh(vehicleType);
    const travelMinutes = (distanceKm / speedKmh) * 60;
    const { minMinutes, maxMinutes } = this.buildEtaRange(travelMinutes, includePickupBuffer);
    return {
      distanceKm,
      minMinutes,
      maxMinutes,
      isRoadRoute: false,
      geometry: points.map(p => [p.latitude, p.longitude] as [number, number])
    };
  }

  /**
   * OSRM ko'cha marshruti orqali masofa va ETA hisoblash (ishlamasa Haversine fallback)
   */
  async estimateRoute(
    points: MapLocation[],
    vehicleType?: number | string,
    includePickupBuffer = false
  ): Promise<RouteEstimate> {
    if (points.length < 2) {
      return { distanceKm: 0, minMinutes: 0, maxMinutes: 0, isRoadRoute: false, geometry: [] };
    }

    const fallback = this.buildFallbackRoute(points, vehicleType, includePickupBuffer);
    if (fallback.distanceKm < 0.05) {
      return fallback;
    }

    const coordsParam = points.map(p => `${p.longitude},${p.latitude}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    try {
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!resp.ok) return fallback;

      const data = await resp.json();
      const route = data?.routes?.[0];
      const coords = route?.geometry?.coordinates;
      if (!route || !Array.isArray(coords) || coords.length === 0) {
        return fallback;
      }

      const distanceKm = Math.round((Number(route.distance) / 1000) * 10) / 10;
      const osrmMinutes = Number(route.duration) / 60;
      const speedKmh = this.getVehicleSpeedKmh(vehicleType);
      const speedMinutes = (distanceKm / speedKmh) * 60;

      const key = typeof vehicleType === 'string' ? vehicleType.trim().toLowerCase() : vehicleType;
      let travelMinutes = speedMinutes;
      if (key === 1 || key === 'car') {
        travelMinutes = Math.max(osrmMinutes * 1.15, speedMinutes);
      } else if (key === 2 || key === 'motorcycle') {
        travelMinutes = Math.max(osrmMinutes * 0.95, speedMinutes);
      }

      const { minMinutes, maxMinutes } = this.buildEtaRange(travelMinutes, includePickupBuffer);
      const geometry: [number, number][] = coords.map((c: [number, number]) => [c[1], c[0]]);

      return {
        distanceKm,
        minMinutes,
        maxMinutes,
        isRoadRoute: true,
        geometry
      };
    } catch {
      clearTimeout(timer);
      return fallback;
    }
  }
}
