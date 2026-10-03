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
  customerId?: number;
  userId?: number; // From backend
  createdAt: string;
  items?: CartItem[];
  cartItems?: CartItem[]; // From backend
  totalPrice?: number; // From backend
}

export interface CreateCartDto {
  customerId: number;
}
