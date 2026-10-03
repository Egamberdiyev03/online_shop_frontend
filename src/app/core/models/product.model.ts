export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  createdAt?: string;
  image?: string;
  companyBranchId?: number;
  quantity: number;
  // Extra UI helpers
  categoryTitle?: string;
  averageRating?: number;
  commentsCount?: number;
}

export interface CreateProductDto {
  name: string;
  description: string;
  price: number;
  categoryId: number;
  image: string;
  quantity: number;
  companyBranchid: number;
}

export interface UpdateProductDto {
  id: number;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  image: string;
  quantity: number;
  companyBranchId: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
