import { Component, Input, Output, EventEmitter, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurierService } from '../../../core/services/curier.service';
import { OrderService } from '../../../core/services/order.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CurierResponseDto, TransportTypeLabels, TransportTypeIcons, CurierShortDto } from '../../../core/models/curier.model';
import { ImageUrlPipe } from '../../pipes/image-url.pipe';

@Component({
  selector: 'app-curier-assign-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageUrlPipe],
  templateUrl: './curier-assign-modal.component.html',
  styleUrl: './curier-assign-modal.component.css'
})
export class CurierAssignModalComponent implements OnChanges {
  private curierService = inject(CurierService);
  private orderService = inject(OrderService);
  private notification = inject(NotificationService);

  @Input() isOpen = false;
  @Input() orderId: number | null = null;
  @Input() currentCurier: CurierShortDto | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() assigned = new EventEmitter<void>();

  curiers = signal<CurierResponseDto[]>([]);
  loading = signal(false);
  submitting = signal(false);
  selectedCurierId: number | null = null;
  searchQuery = '';
  filterOnline = true;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.loadCuriers();
      this.selectedCurierId = null;
      this.searchQuery = '';
    }
  }

  loadCuriers(): void {
    this.loading.set(true);
    this.curierService.getAll({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: (res) => {
        this.curiers.set(res.items?.filter(c => c.isActive) || []);
        this.loading.set(false);
      },
      error: () => {
        this.notification.error('Kuryerlar yuklanmadi');
        this.loading.set(false);
      }
    });
  }

  get filteredCuriers(): CurierResponseDto[] {
    let list = this.curiers();

    if (this.filterOnline) {
      list = list.filter(c => c.isOnline);
    }

    const query = this.searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.phoneNumber.toLowerCase().includes(query)
      );
    }

    // Online kuryerlarni birinchi qilib tartiblash
    return list.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return 0;
    });
  }

  get onlineCuriersCount(): number {
    return this.curiers().filter(c => c.isOnline).length;
  }

  selectCurier(id: number): void {
    this.selectedCurierId = id;
  }

  assign(): void {
    if (!this.selectedCurierId || !this.orderId || this.submitting()) return;

    this.submitting.set(true);
    this.orderService.assignCurier({
      orderId: this.orderId,
      curierProfileId: this.selectedCurierId
    }).subscribe({
      next: () => {
        this.notification.success('Kuryer biriktirildi');
        this.assigned.emit();
        this.onClose();
        this.submitting.set(false);
      },
      error: (err) => {
        this.notification.error(err?.error?.message || 'Xatolik yuz berdi');
        this.submitting.set(false);
      }
    });
  }

  unassign(): void {
    if (!this.orderId || this.submitting()) return;

    this.submitting.set(true);
    this.orderService.unassignCurier(this.orderId).subscribe({
      next: () => {
        this.notification.success('Kuryer olib tashlandi');
        this.assigned.emit();
        this.onClose();
        this.submitting.set(false);
      },
      error: (err) => {
        this.notification.error(err?.error?.message || 'Xatolik yuz berdi');
        this.submitting.set(false);
      }
    });
  }

  onClose(): void {
    this.close.emit();
  }

  getTransportLabel(type: number): string {
    return TransportTypeLabels[type] || "Noma'lum";
  }

  getTransportIcon(type: number): string {
    return TransportTypeIcons[type] || '';
  }

  getInitials(name?: string): string {
    const trimmed = (name || '').trim();
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (trimmed.slice(0, 2) || 'K').toUpperCase();
  }
}
