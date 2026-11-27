import { Component, Input, Output, EventEmitter, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../../core/services/payment.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CurierResponseDto, CurierCashSummaryDto, TransportTypeLabels } from '../../../core/models/curier.model';
import { CompanyBranch } from '../../../core/models/company-branch.model';
import { UzsCurrencyPipe } from '../../pipes/uzs-currency.pipe';

interface CurierWithDebt extends CurierResponseDto {
  cashSummary?: CurierCashSummaryDto;
}

@Component({
  selector: 'app-cash-handover-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, UzsCurrencyPipe],
  templateUrl: './cash-handover-modal.component.html',
  styleUrl: './cash-handover-modal.component.css'
})
export class CashHandoverModalComponent implements OnChanges {
  private paymentService = inject(PaymentService);
  private notification = inject(NotificationService);

  @Input() isOpen = false;
  @Input() curier: CurierWithDebt | null = null;
  @Input() branches: CompanyBranch[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  amount = 0;
  branchId = 0;
  note = '';
  submitting = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.curier) {
      this.amount = this.curier.cashSummary?.debt || 0;
      this.branchId = this.branches[0]?.id || 0;
      this.note = '';
    }
  }

  get maxAmount(): number {
    return this.curier?.cashSummary?.debt || 0;
  }

  get isValidAmount(): boolean {
    return this.amount > 0 && this.amount <= this.maxAmount;
  }

  get canSubmit(): boolean {
    return this.isValidAmount && this.branchId > 0 && !this.submitting();
  }

  setFullAmount(): void {
    this.amount = this.maxAmount;
  }

  setHalfAmount(): void {
    this.amount = Math.floor(this.maxAmount / 2);
  }

  get halfAmount(): number {
    return Math.floor(this.maxAmount / 2);
  }

  submit(): void {
    if (!this.curier || !this.canSubmit) return;

    this.submitting.set(true);
    this.paymentService.handOverCash({
      curierProfileId: this.curier.id,
      companyBranchId: Number(this.branchId),
      amount: Number(this.amount),
      note: this.note || undefined
    }).subscribe({
      next: () => {
        this.notification.success('Pul muvaffaqiyatli qabul qilindi');
        this.success.emit();
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

  getInitials(name?: string): string {
    const trimmed = (name || '').trim();
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (trimmed.slice(0, 2) || 'K').toUpperCase();
  }
}
