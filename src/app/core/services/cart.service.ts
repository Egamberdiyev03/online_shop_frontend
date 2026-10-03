import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cart, CartItem, CreateCartDto } from '../models/cart.model';
import { ResponseModel, unwrapResult } from '../models/response.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Cart`;

  // Signals-based cart state for instant reactive UI across header, cart page, and buttons
  currentCart = signal<Cart | null>(null);
  cartItems = signal<CartItem[]>([]);
  cartItemsCount = signal<number>(0);
  cartCount = this.cartItemsCount;
  isLoading = signal<boolean>(false);

  getByCustomerId(customerId: number): Observable<Cart> {
    this.isLoading.set(true);
    return this.http.get<ResponseModel<Cart> | Cart>(`${this.apiUrl}/GetByCustomerIdCart?UserId=${customerId}`).pipe(
      map(res => unwrapResult(res)),
      tap(cart => {
        this.isLoading.set(false);
        this.currentCart.set(cart);
        const items = cart?.cartItems || cart?.items || [];
        this.cartItems.set(items);
        this.cartItemsCount.set(items.reduce((sum, item) => sum + (item.quantity || 1), 0));
      })
    );
  }

  addItem(customerId: number, productId: number, quantity: number = 1): Observable<boolean> {
    return this.http.post<ResponseModel<boolean> | boolean>(
      `${this.apiUrl}/AddItemtoCart?UserId=${customerId}&productId=${productId}&quantity=${quantity}`,
      null
    ).pipe(
      map(res => {
        const unwrapped = unwrapResult(res);
        return unwrapped === true || unwrapped === null;
      }),
      tap(() => {
        // Refresh cart for customer
        this.getByCustomerId(customerId).subscribe({ error: () => {} });
      })
    );
  }

  updateQuantity(customerId: number, productId: number, quantity: number): Observable<boolean> {
    // Optimistic local update
    this.cartItems.update(items =>
      items.map(item => item.productId === productId ? { ...item, quantity } : item)
    );
    this.cartItemsCount.set(this.cartItems().reduce((sum, item) => sum + item.quantity, 0));

    return this.http.put<ResponseModel<boolean> | boolean>(
      `${this.apiUrl}/Update?UserId=${customerId}&productId=${productId}&quantity=${quantity}`,
      null
    ).pipe(
      map(res => unwrapResult(res) === true)
    );
  }

  removeItem(customerId: number, productId: number): Observable<boolean> {
    // Optimistic local update as required in brief
    this.cartItems.update(items => items.filter(item => item.productId !== productId));
    this.cartItemsCount.set(this.cartItems().reduce((sum, item) => sum + item.quantity, 0));

    return this.http.delete<ResponseModel<boolean> | boolean>(
      `${this.apiUrl}/RemoveItemfromCart?UserId=${customerId}&productId=${productId}`
    ).pipe(
      map(res => unwrapResult(res) === true)
    );
  }

  createCart(dto: CreateCartDto): Observable<Cart> {
    return this.http.post<ResponseModel<Cart> | Cart>(`${this.apiUrl}/Create`, dto).pipe(
      map(res => unwrapResult(res))
    );
  }

  clearLocalCart(): void {
    this.currentCart.set(null);
    this.cartItems.set([]);
    this.cartItemsCount.set(0);
  }
}
