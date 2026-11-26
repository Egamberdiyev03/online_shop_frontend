import { CurierShortDto } from './curier.model';

export enum OrderStatus {
  Pending = 0,
  Confirmed = 1,
  AssignedToCourier = 2,
  Shipped = 3,
  Delivered = 4,
  Cancelled = 5,
  DeliveryFailed = 6
}

export function parseOrderStatus(status: any): OrderStatus {
  if (typeof status === 'number') return status;
  if (typeof status === 'string') {
    switch (status.trim().toLowerCase()) {
      case 'pending': return OrderStatus.Pending;
      case 'confirmed': return OrderStatus.Confirmed;
      case 'assignedtocourier': return OrderStatus.AssignedToCourier;
      case 'shipped': return OrderStatus.Shipped;
      case 'delivered': return OrderStatus.Delivered;
      case 'cancelled': return OrderStatus.Cancelled;
      case 'deliveryfailed': return OrderStatus.DeliveryFailed;
      default:
        const parsed = parseInt(status, 10);
        return isNaN(parsed) ? OrderStatus.Pending : parsed;
    }
  }
  return OrderStatus.Pending;
}

export const OrderStatusLabels: Record<any, { label: string; color: string; bg: string }> = {
  [OrderStatus.Pending]: { label: 'Kutilmoqda', color: '#b45309', bg: '#fef3c7' },
  [OrderStatus.Confirmed]: { label: 'Tasdiqlangan', color: '#1d4ed8', bg: '#dbeafe' },
  [OrderStatus.AssignedToCourier]: { label: 'Kuryerga biriktirilgan', color: '#7c3aed', bg: '#ede9fe' },
  [OrderStatus.Shipped]: { label: "Jo'natildi", color: '#6d28d9', bg: '#ede9fe' },
  [OrderStatus.Delivered]: { label: 'Yetkazildi', color: '#15803d', bg: '#dcfce7' },
  [OrderStatus.Cancelled]: { label: 'Bekor qilindi', color: '#b91c1c', bg: '#fee2e2' },
  [OrderStatus.DeliveryFailed]: { label: "Yetkazib bo'lmadi", color: '#dc2626', bg: '#fef2f2' },

  'Pending': { label: 'Kutilmoqda', color: '#b45309', bg: '#fef3c7' },
  'pending': { label: 'Kutilmoqda', color: '#b45309', bg: '#fef3c7' },
  'Confirmed': { label: 'Tasdiqlangan', color: '#1d4ed8', bg: '#dbeafe' },
  'confirmed': { label: 'Tasdiqlangan', color: '#1d4ed8', bg: '#dbeafe' },
  'AssignedToCourier': { label: 'Kuryerga biriktirilgan', color: '#7c3aed', bg: '#ede9fe' },
  'assignedtocourier': { label: 'Kuryerga biriktirilgan', color: '#7c3aed', bg: '#ede9fe' },
  'Shipped': { label: "Jo'natildi", color: '#6d28d9', bg: '#ede9fe' },
  'shipped': { label: "Jo'natildi", color: '#6d28d9', bg: '#ede9fe' },
  'Delivered': { label: 'Yetkazildi', color: '#15803d', bg: '#dcfce7' },
  'delivered': { label: 'Yetkazildi', color: '#15803d', bg: '#dcfce7' },
  'Cancelled': { label: 'Bekor qilindi', color: '#b91c1c', bg: '#fee2e2' },
  'cancelled': { label: 'Bekor qilindi', color: '#b91c1c', bg: '#fee2e2' },
  'DeliveryFailed': { label: "Yetkazib bo'lmadi", color: '#dc2626', bg: '#fef2f2' },
  'deliveryfailed': { label: "Yetkazib bo'lmadi", color: '#dc2626', bg: '#fef2f2' },
};

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

import { Payment } from './payment.model';

export interface Order {
  id: number;
  customerId: number;
  userId?: number;
  companyBranchId: number;
  branchName?: string;
  createdAt: string;
  totalPrice: number;
  status: OrderStatus;
  curierProfileId?: number | null;
  curier?: CurierShortDto | null;
  orderItems: OrderItem[];
  deliveryAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryNotes?: string;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  payment?: Payment;
}

export interface CreateOrderDto {
  deliveryAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryNotes?: string;
}

export type OrderPaymentFilter = 'all' | 'unpaid' | 'pending' | 'completed' | 'failed';

export interface OrderFilter {
  status?: OrderStatus | number | null;
  search?: string | null;
  branchId?: number | null;
  companyId?: number | null;
  curierProfileId?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  paymentStatus?: OrderPaymentFilter | null;
  sortBy?: 'createdAt_desc' | 'createdAt_asc' | 'totalPrice_desc' | 'totalPrice_asc' | string;
  pageNumber?: number;
  pageSize?: number;
}

export interface OrderStatusCounts {
  all: number;
  pending: number;
  confirmed: number;
  assigned: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  failed: number;
}
