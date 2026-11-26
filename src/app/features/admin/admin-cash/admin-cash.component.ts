import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurierService } from '../../../core/services/curier.service';
import { PaymentService } from '../../../core/services/payment.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CompanyService } from '../../../core/services/company.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CurierResponseDto, CurierCashSummaryDto, TransportTypeLabels } from '../../../core/models/curier.model';
import { CompanyBranch } from '../../../core/models/company-branch.model';

interface CurierWithDebt extends CurierResponseDto {
  cashSummary?: CurierCashSummaryDto;
}

@Component({
  selector: 'app-admin-cash',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-cash.component.html',
  styleUrl: './admin-cash.component.css'
})
export class AdminCashComponent implements OnInit {
  private curierService = inject(CurierService);
  private paymentService = inject(PaymentService);
  private companyService = inject(CompanyService);
  private notification = inject(NotificationService);
  authState = inject(AuthStateService);

  curiers = signal<CurierWithDebt[]>([]);
  branches = signal<CompanyBranch[]>([]);
  selectedBranchFilter: number = 0;
  loading = signal(true);

  // Modal
  modalOpen = signal(false);
  selectedCurier = signal<CurierWithDebt | null>(null);
  handoverAmount = 0;
  handoverBranchId = 0;
  handoverNote = '';
  submitting = signal(false);

  ngOnInit(): void {
    if (this.authState.isBranchManager() && this.authState.userBranchId()) {
      this.selectedBranchFilter = this.authState.userBranchId()!;
    }
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.companyService.getAllBranches().subscribe(b => {
      if (this.authState.isBranchManager() && this.authState.userBranchId()) {
        this.branches.set(b.filter(br => br.id === this.authState.userBranchId()));
      } else {
        this.branches.set(b);
      }
    });

    this.curierService.getAll({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: (res) => {
        const activeCuriers = (res.items || []).filter(c => c.isActive);
        this.loadCashSummaries(activeCuriers);
      },
      error: (err) => {
        this.notification.error(err?.error?.message || err?.message || 'Kuryerlar yuklanmadi');
        this.loading.set(false);
      }
    });
  }

  private loadCashSummaries(curiers: CurierResponseDto[]): void {
    if (curiers.length === 0) {
      this.curiers.set([]);
      this.loading.set(false);
      return;
    }

    let loaded = 0;
    const result: CurierWithDebt[] = [];
    const branchFilter = Number(this.selectedBranchFilter) > 0 ? Number(this.selectedBranchFilter) : undefined;

    curiers.forEach(c => {
      this.paymentService.getCurierCashSummary(c.id, branchFilter).subscribe({
        next: (summary) => {
          result.push({ ...c, cashSummary: summary });
          loaded++;
          if (loaded === curiers.length) {
            this.curiers.set(result.sort((a, b) => (b.cashSummary?.debt || 0) - (a.cashSummary?.debt || 0)));
            this.loading.set(false);
          }
        },
        error: () => {
          result.push({ ...c, cashSummary: { collected: 0, handedOver: 0, debt: 0 } });
          loaded++;
          if (loaded === curiers.length) {
            this.curiers.set(result);
            this.loading.set(false);
          }
        }
      });
    });
  }

  openModal(curier: CurierWithDebt): void {
    this.selectedCurier.set(curier);
    this.handoverAmount = curier.cashSummary?.debt || 0;
    this.handoverBranchId = this.branches()[0]?.id || 0;
    this.handoverNote = '';
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.selectedCurier.set(null);
  }

  submitHandover(): void {
    const curier = this.selectedCurier();
    if (!curier || this.submitting()) return;

    if (this.handoverAmount <= 0) {
      this.notification.warning('Summa 0 dan katta bo\'lishi kerak');
      return;
    }

    if (this.handoverAmount > (curier.cashSummary?.debt || 0)) {
      this.notification.warning('Summa qarzdan oshmasligi kerak');
      return;
    }

    this.submitting.set(true);
    this.paymentService.handOverCash({
      curierProfileId: curier.id,
      companyBranchId: Number(this.handoverBranchId),
      amount: Number(this.handoverAmount),
      note: this.handoverNote || undefined
    }).subscribe({
      next: () => {
        this.notification.success('Pul qabul qilindi');
        this.closeModal();
        this.loadData();
        this.submitting.set(false);
      },
      error: (err) => {
        this.notification.error(err?.error?.message || err?.message || 'Xatolik');
        this.submitting.set(false);
      }
    });
  }

  formatMoney(amount: number): string {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
  }

  getTransportLabel(type: number): string {
    return TransportTypeLabels[type] || '';
  }
}
