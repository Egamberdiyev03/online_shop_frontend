export interface Comment {
  id: number;
  content: string;
  userId: number;
  userName?: string;
  productId: number;
  createdAt: string;
  updatedAt?: string;
  starRating: number;
}

export interface CreateCommentDto {
  content: string;
  userId: number;
  productId: number;
  starRating: number;
}

export interface UpdateCommentDto {
  id: number;
  content: string;
  starRating: number;
}

