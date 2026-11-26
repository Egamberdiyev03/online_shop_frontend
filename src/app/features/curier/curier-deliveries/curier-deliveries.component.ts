import { Component, inject, signal, effect, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import { OrderService } from '../../../core/services/order.service';
import { PaymentService } from '../../../core/services/payment.service';
import { CompanyService } from '../../../core/services/company.service';
import { CurierService } from '../../../core/services/curier.service';
import { CurierLocationService } from '../../../core/services/curier-location.service';
import { MapService, MapLocation, RouteEstimate } from '../../../core/services/map.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UserNotificationService } from '../../../core/services/user-notification.service';
import { Order, OrderStatus, OrderStatusLabels } from '../../../core/models/order.model';
import { CompanyBranch } from '../../../core/models/company-branch.model';
import { PaymentStatus, parsePaymentStatus } from '../../../core/models/payment.model';
import { CurierCashSummaryDto, CurierResponseDto, TransportTypeIcons } from '../../../core/models/curier.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-curier-deliveries',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './curier-deliveries.component.html',
  styleUrl: './curier-deliveries.component.css'
})
export class CurierDeliveriesComponent implements OnInit, OnDestroy {
  private orderService = inject(OrderService);
  private paymentService = inject(PaymentService);
  private companyService = inject(CompanyService);
  private curierService = inject(CurierService);
  public curierLocation = inject(CurierLocationService);
  private mapService = inject(MapService);
  private notification = inject(NotificationService);
  private userNotification = inject(UserNotificationService);
  private route = inject(ActivatedRoute);

  highlightedOrderId = signal<number | null>(null);
  deliveries = signal<Order[]>([]);
  branches = signal<CompanyBranch[]>([]);
  myProfile = signal<CurierResponseDto | null>(null);
  cashSummary = signal<CurierCashSummaryDto | null>(null);
  confirmCashOrder = signal<Order | null>(null);
  routeOrder = signal<Order | null>(null);
  routeEstimate = signal<RouteEstimate | null>(null);
  routeLegLabel = signal<string>('');
  locatingSelf = signal<boolean>(false);
  loading = signal(true);
  actionLoading = signal<number | null>(null);
  currentFilter = signal<string>('active');
  pageNumber = signal(1);
  totalPages = signal(1);
  hasPreviousPage = signal(false);
  hasNextPage = signal(false);

  private routeMap?: L.Map;
  private selfMarker?: L.Marker;
  private branchMarker?: L.Marker;
  private deliveryMarker?: L.Marker;
  private routeLayer?: L.Polyline;
  private boundsFitted = false;
  private lastRouteKey = '';
  private lastSelfLoc: MapLocation | null = null;
  private routeSessionId = 0;

  OrderStatus = OrderStatus;

  statusFilters = [
    { value: 'active', label: 'Faol' },
    { value: 'all', label: 'Barchasi' },
    { value: 'delivered', label: 'Yetkazilgan' }
  ];

  constructor() {
    effect(() => {
      const eventAt = this.userNotification.lastOrderEventAt();
      if (eventAt > 0) {
        this.loadDeliveries();
      }
    });

    effect(() => {
      const coords = this.curierLocation.lastCoords();
      const activeOrder = this.routeOrder();
      if (coords && activeOrder) {
        setTimeout(() => this.renderOrUpdateRouteMap(), 30);
      }
    });
  }

  ngOnInit(): void {
    const paramId = this.route.snapshot.paramMap.get('id');
    const queryOrderId = this.route.snapshot.queryParamMap.get('orderId');
    const initialId = Number(paramId || queryOrderId);
    if (!isNaN(initialId) && initialId > 0) {
      this.highlightedOrderId.set(initialId);
    }

    this.route.paramMap.subscribe(pm => {
      const nextId = Number(pm.get('id') || this.route.snapshot.queryParamMap.get('orderId'));
      if (!isNaN(nextId) && nextId > 0) {
        this.highlightedOrderId.set(nextId);
        this.focusHighlightedOrderIfNeeded();
      }
    });

    this.loadDeliveries();
    this.loadCashSummary();
    this.companyService.getAllBranches().subscribe({
      next: (list) => this.branches.set(list || []),
      error: () => {}
    });
    this.curierService.getMyProfile().subscribe({
      next: (p) => this.myProfile.set(p),
      error: () => {}
    });
  }

  private focusHighlightedOrderIfNeeded(): void {
    const targetId = this.highlightedOrderId();
    if (!targetId) return;
    const all = this.deliveries();
    const target = all.find(o => o.id === targetId);
    if (!target) return;

    if (!this.filteredDeliveries.some(o => o.id === targetId)) {
      this.currentFilter.set('all');
    }
    setTimeout(() => {
      const el = document.getElementById(`delivery-card-${targetId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroyRouteMap();
  }

  loadCashSummary(): void {
    this.paymentService.getMyCashSummary().subscribe({
      next: (s) => this.cashSummary.set(s),
      error: () => {}
    });
  }

  loadDeliveries(page: number = this.pageNumber()): void {
    this.loading.set(true);
    this.orderService.getMyDeliveries({ pageNumber: page, pageSize: 10 }).subscribe({
      next: (res) => {
        this.deliveries.set(res.items || []);
        this.pageNumber.set(res.pageNumber || page);
        this.totalPages.set(res.totalPages || 1);
        this.hasPreviousPage.set(res.hasPreviousPage ?? page > 1);
        this.hasNextPage.set(res.hasNextPage ?? false);
        this.loading.set(false);
        this.focusHighlightedOrderIfNeeded();
      },
      error: (err) => {
        this.notification.error(err?.error?.message || err?.message || 'Yetkazmalar yuklanmadi');
        this.loading.set(false);
      }
    });
  }

  prevPage(): void {
    if (this.hasPreviousPage() && !this.loading()) {
      this.loadDeliveries(this.pageNumber() - 1);
    }
  }

  nextPage(): void {
    if (this.hasNextPage() && !this.loading()) {
      this.loadDeliveries(this.pageNumber() + 1);
    }
  }

  get filteredDeliveries(): Order[] {
    const filter = this.currentFilter();
    const all = this.deliveries();
    if (filter === 'active') {
      return all.filter(o => o.status !== OrderStatus.Delivered && o.status !== OrderStatus.Cancelled);
    }
    if (filter === 'delivered') {
      return all.filter(o => o.status === OrderStatus.Delivered);
    }
    return all;
  }

  setFilter(value: string): void {
    this.currentFilter.set(value);
  }

  canPickUp(order: Order): boolean {
    return order.status === OrderStatus.Pending ||
           order.status === OrderStatus.Confirmed ||
           order.status === OrderStatus.AssignedToCourier;
  }

  canDeliver(order: Order): boolean {
    return order.status === OrderStatus.Shipped;
  }

  isCashPayment(order: Order): boolean {
    if (order.payment?.paymentMethod?.toLowerCase() !== 'cash') return false;
    return parsePaymentStatus(order.payment?.status) !== PaymentStatus.Completed;
  }

  private extractError(err: any): string {
    return err?.error?.message || err?.message || 'Xatolik yuz berdi';
  }

  pickUp(order: Order): void {
    if (this.actionLoading()) return;
    this.actionLoading.set(order.id);

    this.orderService.updateCurierStatus(order.id, OrderStatus.Shipped).subscribe({
      next: () => {
        this.notification.success('Buyurtma olindi');
        this.loadDeliveries();
        this.actionLoading.set(null);
      },
      error: (err) => {
        this.notification.error(this.extractError(err));
        this.actionLoading.set(null);
      }
    });
  }

  rejectAssignment(order: Order): void {
    if (this.actionLoading()) return;
    this.actionLoading.set(order.id);

    this.orderService.rejectAssignment(order.id).subscribe({
      next: () => {
        this.notification.info('Buyurtma rad etildi');
        this.loadDeliveries();
        this.actionLoading.set(null);
      },
      error: (err) => {
        this.notification.error(this.extractError(err));
        this.actionLoading.set(null);
      }
    });
  }

  requestCollectCash(order: Order): void {
    if (this.actionLoading()) return;
    this.confirmCashOrder.set(order);
  }

  closeConfirmCashModal(): void {
    if (this.actionLoading()) return;
    this.confirmCashOrder.set(null);
  }

  collectCashAndDeliver(order: Order): void {
    if (this.actionLoading()) return;
    this.actionLoading.set(order.id);

    this.paymentService.collectCash(order.id).subscribe({
      next: () => {
        this.notification.success(`Buyurtma yetkazildi va ${this.formatMoney(order.totalPrice)} yig'ildi`);
        this.confirmCashOrder.set(null);
        this.loadDeliveries();
        this.loadCashSummary();
        this.actionLoading.set(null);
      },
      error: (err) => {
        this.notification.error(this.extractError(err));
        this.actionLoading.set(null);
      }
    });
  }

  markDelivered(order: Order): void {
    if (this.actionLoading()) return;
    this.actionLoading.set(order.id);

    this.orderService.updateCurierStatus(order.id, OrderStatus.Delivered).subscribe({
      next: () => {
        this.notification.success('Buyurtma yetkazildi');
        this.loadDeliveries();
        this.actionLoading.set(null);
      },
      error: (err) => {
        this.notification.error(this.extractError(err));
        this.actionLoading.set(null);
      }
    });
  }

  formatMoney(amount: number): string {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
  }

  getStatusLabel(status: OrderStatus): string {
    return OrderStatusLabels[status]?.label || 'Noma\'lum';
  }

  getBranchName(branchId: number): string {
    const branch = this.branches().find(b => b.id === branchId);
    return branch ? (branch.name || branch.address || `Filial #${branchId}`) : `Filial #${branchId}`;
  }

  getBranchAddress(branchId: number): string {
    return this.branches().find(b => b.id === branchId)?.address || '';
  }

  hasDeliveryCoords(order: Order): boolean {
    return this.mapService.isValidCoord(order.deliveryLatitude, order.deliveryLongitude);
  }

  canOpenRouteMap(order: Order): boolean {
    return this.hasDeliveryCoords(order) || !!this.getOrderBranchLoc(order);
  }

  private getSelfLocation(): MapLocation | null {
    const live = this.curierLocation.lastCoords();
    if (live && this.mapService.isValidCoord(live.latitude, live.longitude)) {
      return live;
    }
    const p = this.myProfile();
    if (p && this.mapService.isValidCoord(p.latitude, p.longitude)) {
      return { latitude: Number(p.latitude), longitude: Number(p.longitude) };
    }
    return null;
  }

  private getOrderBranchLoc(order: Order): MapLocation | null {
    const branch = this.branches().find(b => b.id === order.companyBranchId);
    return this.mapService.extractBranchLocation(branch);
  }

  private getOrderDeliveryLoc(order: Order): MapLocation | null {
    if (!this.hasDeliveryCoords(order)) return null;
    return {
      latitude: Number(order.deliveryLatitude),
      longitude: Number(order.deliveryLongitude),
      address: order.deliveryAddress
    };
  }

  getRouteGoogleMapsUrl(order: Order | null): string | null {
    if (!order) return null;
    const deliveryLoc = this.getOrderDeliveryLoc(order);
    if (deliveryLoc) {
      return this.mapService.getDirectionsUrl(
        this.getSelfLocation() || this.getOrderBranchLoc(order),
        deliveryLoc
      );
    }
    if (order.deliveryAddress && order.deliveryAddress.trim()) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress.trim())}`;
    }
    return null;
  }

  openRouteModal(order: Order): void {
    this.destroyRouteMap();
    this.routeSessionId++;
    this.routeOrder.set(order);
    this.routeEstimate.set(null);
    this.routeLegLabel.set('');
    setTimeout(() => this.renderOrUpdateRouteMap(), 50);
    if (!this.curierLocation.lastCoords()) {
      this.refreshMyGps();
    }
  }

  closeRouteModal(): void {
    this.routeSessionId++;
    this.destroyRouteMap();
    this.routeOrder.set(null);
    this.routeEstimate.set(null);
    this.routeLegLabel.set('');
  }

  refreshMyGps(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation || this.locatingSelf()) return;
    this.locatingSelf.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.locatingSelf.set(false);
        this.curierLocation.lastCoords.set({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
        this.renderOrUpdateRouteMap();
      },
      () => {
        this.locatingSelf.set(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  private renderOrUpdateRouteMap(): void {
    const order = this.routeOrder();
    const el = document.getElementById('curier-delivery-route-map');
    if (!order || !el) return;

    const selfLoc = this.getSelfLocation();
    const branchLoc = this.getOrderBranchLoc(order);
    const deliveryLoc = this.getOrderDeliveryLoc(order);
    const allPoints = [branchLoc, selfLoc, deliveryLoc].filter((p): p is MapLocation => !!p);
    if (allPoints.length === 0) return;

    const first = selfLoc || deliveryLoc || branchLoc!;
    if (!this.routeMap) {
      this.routeMap = L.map(el).setView([first.latitude, first.longitude], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(this.routeMap);
      this.routeMap.invalidateSize();
    }

    if (branchLoc && !this.branchMarker) {
      const bName = this.mapService.escapeHtml(this.getBranchName(order.companyBranchId));
      const bAddr = this.getBranchAddress(order.companyBranchId);
      const bPopup = `🏢 <strong>${bName}</strong>${bAddr ? `<br><small>${this.mapService.escapeHtml(bAddr)}</small>` : ''}`;
      this.branchMarker = L.marker([branchLoc.latitude, branchLoc.longitude], {
        icon: this.mapService.createEmojiPin('🏢', '#4f46e5')
      }).addTo(this.routeMap).bindPopup(bPopup);
    }

    if (deliveryLoc && !this.deliveryMarker) {
      const dAddr = order.deliveryAddress ? `<br><small>${this.mapService.escapeHtml(order.deliveryAddress)}</small>` : '';
      this.deliveryMarker = L.marker([deliveryLoc.latitude, deliveryLoc.longitude], {
        icon: this.mapService.createEmojiPin('🏠', '#ef4444')
      }).addTo(this.routeMap).bindPopup(`🏠 <strong>Mijoz manzili</strong>${dAddr}`);
    }

    if (selfLoc) {
      const vehicleEmoji = TransportTypeIcons[this.myProfile()?.vehicleType ?? 1] || '🛵';
      if (!this.selfMarker) {
        this.selfMarker = L.marker([selfLoc.latitude, selfLoc.longitude], {
          icon: this.mapService.createEmojiPin(vehicleEmoji, '#16a34a'),
          zIndexOffset: 500
        }).addTo(this.routeMap).bindPopup(`${vehicleEmoji} <strong>Sizning joylashuvingiz</strong>`);
      } else {
        this.selfMarker.setLatLng([selfLoc.latitude, selfLoc.longitude]);
      }
    }

    if (!this.boundsFitted && allPoints.length > 0) {
      if (allPoints.length === 1) {
        this.routeMap.setView([allPoints[0].latitude, allPoints[0].longitude], 15);
      } else {
        this.routeMap.fitBounds(
          allPoints.map(p => [p.latitude, p.longitude] as [number, number]),
          { padding: [45, 45], maxZoom: 16 }
        );
      }
      this.boundsFitted = true;
    }

    this.updateRoutePolyline(order, selfLoc, branchLoc, deliveryLoc);
  }

  private async updateRoutePolyline(
    order: Order,
    selfLoc: MapLocation | null,
    branchLoc: MapLocation | null,
    deliveryLoc: MapLocation | null
  ): Promise<void> {
    let points: MapLocation[] = [];
    let includePickupBuffer = false;
    let label = '';

    if (selfLoc && deliveryLoc) {
      if (order.status === OrderStatus.Shipped || !branchLoc) {
        points = [selfLoc, deliveryLoc];
        label = 'Siz → Mijoz manzili';
      } else {
        const toBranchKm = this.mapService.calculateDistance(selfLoc, branchLoc);
        if (toBranchKm < 0.25) {
          points = [branchLoc, deliveryLoc];
          label = 'Filial (olish +5 daq) → Mijoz manzili';
        } else {
          points = [selfLoc, branchLoc, deliveryLoc];
          label = 'Siz → Filial → Mijoz manzili';
        }
        includePickupBuffer = true;
      }
    } else if (branchLoc && deliveryLoc) {
      points = [branchLoc, deliveryLoc];
      includePickupBuffer = order.status !== OrderStatus.Shipped;
      label = 'Filial → Mijoz manzili';
    } else if (selfLoc && branchLoc) {
      points = [selfLoc, branchLoc];
      label = 'Siz → Filial';
    } else {
      this.routeEstimate.set(null);
      this.routeLegLabel.set('');
      return;
    }

    this.routeLegLabel.set(label);
    const vehicleType = this.myProfile()?.vehicleType;
    const key = `${order.id}:${order.status}:${points.length}:${vehicleType ?? 'x'}`;
    const moved = !selfLoc || !this.lastSelfLoc || this.mapService.calculateDistance(selfLoc, this.lastSelfLoc) >= 0.05;
    if (this.lastRouteKey === key && !moved && this.routeEstimate()) {
      return;
    }

    this.lastRouteKey = key;
    this.lastSelfLoc = selfLoc ? { ...selfLoc } : null;
    const sessionId = this.routeSessionId;

    const estimate = await this.mapService.estimateRoute(points, vehicleType, includePickupBuffer);
    if (sessionId !== this.routeSessionId || !this.routeOrder() || !this.routeMap) {
      return;
    }

    this.routeEstimate.set(estimate);
    if (this.routeLayer) {
      this.routeLayer.remove();
      this.routeLayer = undefined;
    }
    if (estimate.geometry.length >= 2) {
      this.routeLayer = L.polyline(estimate.geometry, {
        color: '#4f46e5',
        weight: 4,
        opacity: 0.85,
        dashArray: estimate.isRoadRoute ? undefined : '8, 8'
      }).addTo(this.routeMap);
    }
  }

  private destroyRouteMap(): void {
    if (this.routeLayer) {
      this.routeLayer.remove();
      this.routeLayer = undefined;
    }
    if (this.routeMap) {
      this.routeMap.remove();
      this.routeMap = undefined;
    }
    this.selfMarker = undefined;
    this.branchMarker = undefined;
    this.deliveryMarker = undefined;
    this.boundsFitted = false;
    this.lastRouteKey = '';
    this.lastSelfLoc = null;
  }
}
