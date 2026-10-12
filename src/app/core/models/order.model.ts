export enum OrderStatus {
  Pending = 0,
  Confirmed = 1,
  Shipped = 2,
  Delivered = 3,
  Cancelled = 4
}

export const OrderStatusLabels: Record<OrderStatus | number, { label: string; color: string; bg: string }> = {
  [OrderStatus.Pending]: { label: 'Kutilmoqda', color: '#b45309', bg: '#fef3c7' },
  [OrderStatus.Confirmed]: { label: 'Tasdiqlangan', color: '#1d4ed8', bg: '#dbeafe' },
  [OrderStatus.Shipped]: { label: "Jo'natildi", color: '#6d28d9', bg: '#ede9fe' },
  [OrderStatus.Delivered]: { label: 'Yetkazildi', color: '#15803d', bg: '#dcfce7' },
  [OrderStatus.Cancelled]: { label: 'Bekor qilindi', color: '#b91c1c', bg: '#fee2e2' },
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
  companyBranchId: number;
  branchName?: string;
  createdAt: string;
  totalPrice: number;
  status: OrderStatus;
  orderItems: OrderItem[];
  deliveryAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  payment?: Payment;
}

export interface CreateOrderDto {
  customerId: number;
  branchId: number;
  deliveryAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
}

export type OrderPaymentFilter = 'all' | 'unpaid' | 'pending' | 'completed' | 'failed';

export interface OrderFilter {
  status?: OrderStatus | number | null;
  search?: string | null;
  branchId?: number | null;
  companyId?: number | null;
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
  shipped: number;
  delivered: number;
  cancelled: number;
}

