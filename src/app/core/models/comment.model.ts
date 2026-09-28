export interface Comment {
  id: number;
  content: string;
  customerId: number;
  customerName?: string;
  productId: number;
  createdAt: string;
  updatedAt?: string;
  starRating: number;
}

export interface CreateCommentDto {
  content: string;
  customerId: number;
  productId: number;
  starRating: number;
}

export interface UpdateCommentDto {
  id: number;
  content: string;
  starRating: number;
}
