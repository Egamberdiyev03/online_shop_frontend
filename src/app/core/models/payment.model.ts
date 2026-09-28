export enum PaymentStatus {
  Pending = 0,
  Completed = 1,
  Failed = 2,
  Refunded = 3
}

export interface Payment {
  id: number;
  orderId: number;
  createdAt: string;
  amount?: number;
  status?: PaymentStatus;
}
