import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as L from 'leaflet';
import { CurierService } from '../../../core/services/curier.service';
import { OrderService } from '../../../core/services/order.service';
import { CompanyService } from '../../../core/services/company.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CurierResponseDto, TransportTypeIcons, TransportTypeLabels } from '../../../core/models/curier.model';
import { Order, OrderStatus, parseOrderStatus } from '../../../core/models/order.model';
import { CompanyBranch } from '../../../core/models/company-branch.model';
import { ImageUrlPipe } from '../../../shared/pipes/image-url.pipe';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-admin-curiers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ImageUrlPipe, StatusBadgeComponent],
  templateUrl: './admin-curiers.component.html',
  styleUrl: './admin-curiers.component.css'
})
export class AdminCuriersComponent implements OnInit, OnDestroy {
  private curierService = inject(CurierService);
  private orderService = inject(OrderService);
  private companyService = inject(CompanyService);
  public authState = inject(AuthStateService);
  private notification = inject(NotificationService);
  private route = inject(ActivatedRoute);

  OrderStatus = OrderStatus;
  curiers = signal<CurierResponseDto[]>([]);
  allOrders = signal<Order[]>([]);
  branches = signal<CompanyBranch[]>([]);
  loadingOrders = signal(false);
  ordersCurier = signal<CurierResponseDto | null>(null);
  ordersModalFilter = signal<'active' | 'assigned' | 'shipped' | 'delivered' | 'all'>('active');
  loading = signal(true);
  actionLoading = signal<number | null>(null);
  pageNumber = signal(1);
  totalPages = signal(1);
  hasPreviousPage = signal(false);
  hasNextPage = signal(false);
  onlineFilter = signal<'all' | 'online' | 'offline'>('all');
  searchQuery = signal('');
  selectedCurier = signal<CurierResponseDto | null>(null);
  detailImageBroken = signal(false);
  showMap = signal(false);

  private listMap?: L.Map;
  private detailMap?: L.Map;

  ngOnInit(): void {
    this.loadCuriers();
    this.loadOrdersOverview();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      if (id > 0) {
        this.openDetails(id);
      }
    }
  }

  get canViewCurierOrders(): boolean {
    return this.authState.isSuperAdmin() || this.authState.isCompanyAdmin() || this.authState.isBranchManager();
  }

  loadOrdersOverview(): void {
    if (!this.canViewCurierOrders) return;
    this.loadingOrders.set(true);

    const branches$ = this.companyService.getAllBranches().pipe(catchError(() => of([] as CompanyBranch[])));

    if (this.authState.isBranchManager()) {
      const branchId = this.authState.userBranchId();
      if (!branchId) {
        this.loadingOrders.set(false);
        return;
      }
      forkJoin({
        orders: this.orderService.getOrdersByBranchId(branchId).pipe(catchError(() => of([] as Order[]))),
        branches: branches$
      }).subscribe(({ orders, branches }) => {
        this.branches.set(branches || []);
        this.allOrders.set(orders || []);
        this.loadingOrders.set(false);
      });
      return;
    }

    forkJoin({
      orders: this.orderService.getAll().pipe(catchError(() => of([] as Order[]))),
      branches: branches$
    }).subscribe(({ orders, branches }) => {
      this.branches.set(branches || []);
      if (this.authState.isCompanyAdmin()) {
        const companyId = this.authState.userCompanyId();
        const allowedBranchIds = new Set(
          (branches || []).filter(b => Number(b.companyId) === Number(companyId)).map(b => b.id)
        );
        this.allOrders.set((orders || []).filter(o => allowedBranchIds.has(o.companyBranchId)));
      } else {
        this.allOrders.set(orders || []);
      }
      this.loadingOrders.set(false);
    });
  }

  ngOnDestroy(): void {
    this.destroyListMap();
    this.destroyDetailMap();
  }

  loadCuriers(page: number = this.pageNumber()): void {
    this.loading.set(true);
    this.curierService.getAll({ pageNumber: page, pageSize: 20 }).subscribe({
      next: (res) => {
        this.curiers.set(res.items || []);
        this.pageNumber.set(res.pageNumber || page);
        this.totalPages.set(res.totalPages || 1);
        this.hasPreviousPage.set(res.hasPreviousPage ?? page > 1);
        this.hasNextPage.set(res.hasNextPage ?? false);
        this.loading.set(false);
        if (this.showMap()) {
          setTimeout(() => this.renderListMap(), 50);
        }
      },
      error: (err) => {
        this.notification.error(err?.error?.message || err?.message || 'Kuryerlar yuklanmadi');
        this.loading.set(false);
      }
    });
  }

  toggleMap(): void {
    const next = !this.showMap();
    this.showMap.set(next);
    if (next) {
      setTimeout(() => this.renderListMap(), 50);
    } else {
      this.destroyListMap();
    }
  }

  openDetails(id: number): void {
    this.detailImageBroken.set(false);
    this.curierService.getById(id).subscribe({
      next: (c) => {
        this.selectedCurier.set(c);
        if (c.latitude != null && c.longitude != null) {
          setTimeout(() => this.renderDetailMap(c), 50);
        }
      },
      error: () => {}
    });
  }

  closeDetails(): void {
    this.destroyDetailMap();
    this.selectedCurier.set(null);
  }

  get curiersWithLocationCount(): number {
    return this.activeCuriers.filter(c => c.latitude != null && c.longitude != null).length;
  }

  private renderListMap(): void {
    const el = document.getElementById('admin-curiers-map');
    if (!el) return;
    this.destroyListMap();

    const list = this.activeCuriers.filter(c => c.latitude != null && c.longitude != null);
    const centerLat = list[0]?.latitude ?? 41.2995;
    const centerLng = list[0]?.longitude ?? 69.2401;

    this.listMap = L.map(el).setView([centerLat, centerLng], list.length > 0 ? 12 : 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.listMap);

    const bounds: L.LatLngExpression[] = [];
    list.forEach(c => {
      const latlng: L.LatLngExpression = [c.latitude!, c.longitude!];
      bounds.push(latlng);
      const marker = L.circleMarker(latlng, {
        radius: 9,
        fillColor: c.isOnline ? '#22c55e' : '#64748b',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 0.95
      }).addTo(this.listMap!);
      marker.bindPopup(
        `<strong>${c.name}</strong><br>${this.getTransportLabel(c.vehicleType)}<br>${c.phoneNumber}<br>${c.isOnline ? '🟢 Online' : '⚫ Offline'}`
      );
    });

    if (bounds.length > 1) {
      this.listMap.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [30, 30] });
    }
  }

  private renderDetailMap(c: CurierResponseDto): void {
    const el = document.getElementById('admin-curier-detail-map');
    if (!el || c.latitude == null || c.longitude == null) return;
    this.destroyDetailMap();

    this.detailMap = L.map(el).setView([c.latitude, c.longitude], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.detailMap);

    L.circleMarker([c.latitude, c.longitude], {
      radius: 10,
      fillColor: c.isOnline ? '#22c55e' : '#3b82f6',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 0.95
    })
      .addTo(this.detailMap)
      .bindPopup(`<strong>${c.name}</strong><br>${c.isOnline ? '🟢 Online' : '⚫ Offline'}`)
      .openPopup();
  }

  private destroyListMap(): void {
    if (this.listMap) {
      this.listMap.remove();
      this.listMap = undefined;
    }
  }

  private destroyDetailMap(): void {
    if (this.detailMap) {
      this.detailMap.remove();
      this.detailMap = undefined;
    }
  }

  prevPage(): void {
    if (this.hasPreviousPage() && !this.loading()) this.loadCuriers(this.pageNumber() - 1);
  }

  nextPage(): void {
    if (this.hasNextPage() && !this.loading()) this.loadCuriers(this.pageNumber() + 1);
  }

  get applications(): CurierResponseDto[] {
    return this.curiers().filter(c => !c.isActive);
  }

  get activeCuriers(): CurierResponseDto[] {
    let list = this.curiers().filter(c => c.isActive);
    const f = this.onlineFilter();
    if (f === 'online') list = list.filter(c => c.isOnline);
    if (f === 'offline') list = list.filter(c => !c.isOnline);
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.phoneNumber || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  approve(id: number): void {
    if (this.actionLoading()) return;
    this.actionLoading.set(id);

    this.curierService.approve(id).subscribe({
      next: () => {
        this.notification.success('Kuryer tasdiqlandi');
        this.loadCuriers();
        this.actionLoading.set(null);
      },
      error: (err) => {
        this.notification.error(err?.error?.message || err?.message || 'Xatolik');
        this.actionLoading.set(null);
      }
    });
  }

  reject(id: number): void {
    if (this.actionLoading()) return;
    this.actionLoading.set(id);

    this.curierService.reject(id).subscribe({
      next: () => {
        this.notification.info('Ariza rad etildi');
        this.loadCuriers();
        this.actionLoading.set(null);
      },
      error: (err) => {
        this.notification.error(err?.error?.message || err?.message || 'Xatolik');
        this.actionLoading.set(null);
      }
    });
  }

  getTransportLabel(type: number): string {
    return TransportTypeLabels[type] || 'Noma\'lum';
  }

  getTransportIcon(type: number): string {
    return TransportTypeIcons[type] || '🛵';
  }

  getCurierOrders(curierId: number): Order[] {
    return this.allOrders().filter(o => Number(o.curierProfileId) === Number(curierId));
  }

  getCurierOrderStats(curierId: number): { assigned: number; shipped: number; delivered: number; failed: number; active: number; total: number } {
    const orders = this.getCurierOrders(curierId);
    let assigned = 0;
    let shipped = 0;
    let delivered = 0;
    let failed = 0;

    orders.forEach(o => {
      switch (parseOrderStatus(o.status)) {
        case OrderStatus.Pending:
        case OrderStatus.Confirmed:
        case OrderStatus.AssignedToCourier:
          assigned++;
          break;
        case OrderStatus.Shipped:
          shipped++;
          break;
        case OrderStatus.Delivered:
          delivered++;
          break;
        case OrderStatus.DeliveryFailed:
          failed++;
          break;
      }
    });

    return {
      assigned,
      shipped,
      delivered,
      failed,
      active: assigned + shipped,
      total: orders.length
    };
  }

  openCurierOrders(curier: CurierResponseDto): void {
    this.ordersCurier.set(curier);
    const stats = this.getCurierOrderStats(curier.id);
    this.ordersModalFilter.set(stats.active > 0 ? 'active' : 'all');
  }

  closeCurierOrders(): void {
    this.ordersCurier.set(null);
  }

  get filteredModalOrders(): Order[] {
    const c = this.ordersCurier();
    if (!c) return [];
    const orders = this.getCurierOrders(c.id);
    const filter = this.ordersModalFilter();
    return orders.filter(o => {
      const st = parseOrderStatus(o.status);
      switch (filter) {
        case 'active':
          return st === OrderStatus.Pending || st === OrderStatus.Confirmed || st === OrderStatus.AssignedToCourier || st === OrderStatus.Shipped;
        case 'assigned':
          return st === OrderStatus.Pending || st === OrderStatus.Confirmed || st === OrderStatus.AssignedToCourier;
        case 'shipped':
          return st === OrderStatus.Shipped;
        case 'delivered':
          return st === OrderStatus.Delivered;
        default:
          return true;
      }
    });
  }

  getBranchName(branchId: number): string {
    const br = this.branches().find(b => Number(b.id) === Number(branchId));
    return br?.name || `Filial #${branchId}`;
  }

  formatMoney(amount: number): string {
    return new Intl.NumberFormat('uz-UZ').format(amount || 0) + " so'm";
  }
}
