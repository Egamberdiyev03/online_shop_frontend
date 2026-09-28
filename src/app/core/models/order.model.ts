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

export interface Order {
  id: number;
  customerId: number;
  companyBranchId: number;
  branchName?: string;
  createdAt: string;
  totalPrice: number;
  status: OrderStatus;
  orderItems: OrderItem[];
}

export interface CreateOrderDto {
  customerId: number;
  branchId: number;
}
