import { Product } from './product.model';

export interface CartItem {
  id: number;
  cartId: number;
  productId: number;
  quantity: number;
  // Resolved in frontend for display
  product?: Product;
}

export interface Cart {
  id: number;
  customerId: number;
  createdAt: string;
  items?: CartItem[];
}

export interface CreateCartDto {
  customerId: number;
}
