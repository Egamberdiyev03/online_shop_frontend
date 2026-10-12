export enum PaymentStatus {
  Pending = 0,     // Kutilmoqda (chek tekshirilmoqda)
  Completed = 1,   // Tasdiqlangan / Muvaffaqiyatli
  Failed = 2,      // Rad etilgan / Muvaffaqiyatsiz
  Refunded = 3,    // Qaytarilgan
  Cancelled = 4    // Bekor qilingan
}

export const PaymentStatusLabels: Record<PaymentStatus | number, { label: string; color: string; bg: string; borderColor: string }> = {
  [PaymentStatus.Pending]: { label: 'To‘lov kutilmoqda', color: '#b45309', bg: '#fef3c7', borderColor: '#fde68a' },
  [PaymentStatus.Completed]: { label: 'Tasdiqlangan', color: '#15803d', bg: '#dcfce7', borderColor: '#bbf7d0' },
  [PaymentStatus.Failed]: { label: 'To‘lov rad etildi', color: '#b91c1c', bg: '#fee2e2', borderColor: '#fecaca' },
  [PaymentStatus.Refunded]: { label: 'Qaytarildi', color: '#4b5563', bg: '#f3f4f6', borderColor: '#e5e7eb' },
  [PaymentStatus.Cancelled]: { label: 'Bekor qilindi', color: '#6b7280', bg: '#e5e7eb', borderColor: '#d1d5db' },
};

export interface Payment {
  id: number;
  orderId: number;
  amount: number;
  createdAt: string;
  status: PaymentStatus;
  paymentMethod?: string;
  chekUrl?: string;
  transactionNote?: string;
  confirmedByUserId?: number;
  confirmedAt?: string;
  rejectionReason?: string;
}

export interface PaymentListItem {
  id: number;
  orderId: number;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
  paymentMethod?: string;
  chekUrl?: string;
  transactionNote?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerId?: number;
  branchId?: number;
  branchName?: string;
  companyId?: number;
  companyName?: string;
  confirmedAt?: string;
  confirmedByUserId?: number;
  confirmedByName?: string;
  rejectionReason?: string;
}

export interface PaymentDetails extends Payment {
  order?: {
    id: number;
    status: number;
    totalPrice: number;
    createdAt: string;
    orderItems: {
      id: number;
      productId: number;
      productName: string;
      quantity: number;
      unitPrice: number;
    }[];
    deliveryAddress?: string;
    deliveryLatitude?: number;
    deliveryLongitude?: number;
  };
  customer?: {
    id: number;
    name: string;
    phoneNumber?: string;
    email?: string;
    address?: string;
  };
  branch?: {
    id: number;
    name: string;
    address?: string;
    phoneNumber?: string;
    companyId?: number;
    companyName?: string;
  };
  confirmedByName?: string;
}

export interface PaymentSummary {
  totalCount: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
  completedCount: number;
  completedAmount: number;
  failedCount: number;
  failedAmount: number;
  cancelledCount: number;
  cancelledAmount: number;
}

export interface PaymentFilter {
  status?: PaymentStatus | number | null;
  branchId?: number | null;
  companyId?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string | null;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'amount' | string;
  sortDirection?: 'asc' | 'desc';
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface CreatePaymentDto {
  orderId: number;
  userId: number;
  amount: number;
  paymentMethod?: string;
  chekUrl?: string;
  transactionNote?: string;
}

export interface RejectPaymentDto {
  paymentId: number;
  reason: string;
}
