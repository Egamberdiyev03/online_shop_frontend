import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, of, forkJoin, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cart, CartItem, CreateCartDto } from '../models/cart.model';
import { ResponseModel, unwrapResult } from '../models/response.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Cart`;
  private readonly GUEST_CART_KEY = 'online_shop_guest_cart';

  // Signals-based cart state for instant reactive UI across header, cart page, and buttons
  currentCart = signal<Cart | null>(null);
  cartItems = signal<CartItem[]>(this.getGuestCart());
  cartItemsCount = signal<number>(this.calculateCount(this.getGuestCart()));
  cartCount = this.cartItemsCount;
  isLoading = signal<boolean>(false);

  private getGuestCart(): CartItem[] {
    const raw = localStorage.getItem(this.GUEST_CART_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveGuestCart(items: CartItem[]): void {
    localStorage.setItem(this.GUEST_CART_KEY, JSON.stringify(items));
    this.cartItems.set(items);
    this.cartItemsCount.set(this.calculateCount(items));
  }

  private calculateCount(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  }

  getByCustomerId(customerId: number): Observable<Cart> {
    // Agar mijoz tizimga kirmagan bo'lsa (mehmon bo'lsa)
    if (!customerId || customerId <= 0) {
      const guestItems = this.getGuestCart();
      const mockCart: Cart = {
        id: 0,
        customerId: 0,
        createdAt: new Date().toISOString(),
        items: guestItems,
        cartItems: guestItems
      };
      this.currentCart.set(mockCart);
      this.cartItems.set(guestItems);
      this.cartItemsCount.set(this.calculateCount(guestItems));
      return of(mockCart);
    }

    this.isLoading.set(true);
    return this.http.get<ResponseModel<Cart> | Cart>(`${this.apiUrl}/GetByCustomerIdCart?UserId=${customerId}`).pipe(
      map(res => unwrapResult(res)),
      tap(cart => {
        this.isLoading.set(false);
        this.currentCart.set(cart);
        const items = cart?.cartItems || cart?.items || [];
        this.cartItems.set(items);
        this.cartItemsCount.set(this.calculateCount(items));
      })
    );
  }

  addItem(customerId: number, productId: number, quantity: number = 1): Observable<boolean> {
    // Agar mijoz tizimga kirmagan bo'lsa (mehmon), savatni localStorage'da saqlaymiz
    if (!customerId || customerId <= 0) {
      const items = this.getGuestCart();
      const existing = items.find(i => i.productId === productId);
      if (existing) {
        existing.quantity += quantity;
      } else {
        items.push({
          id: Date.now(),
          cartId: 0,
          productId: productId,
          quantity: quantity
        });
      }
      this.saveGuestCart(items);
      return of(true);
    }

    // Tizimga kirgan mijoz uchun backend API
    return this.http.post<ResponseModel<boolean> | boolean>(
      `${this.apiUrl}/AddItemtoCart?UserId=${customerId}&productId=${productId}&quantity=${quantity}`,
      null
    ).pipe(
      map(res => {
        const unwrapped = unwrapResult(res);
        return unwrapped === true || unwrapped === null;
      }),
      tap(() => {
        this.getByCustomerId(customerId).subscribe({ error: () => {} });
      })
    );
  }

  updateQuantity(customerId: number, productId: number, quantity: number): Observable<boolean> {
    if (!customerId || customerId <= 0) {
      const items = this.getGuestCart().map(item =>
        item.productId === productId ? { ...item, quantity } : item
      );
      this.saveGuestCart(items);
      return of(true);
    }

    // Optimistic local update
    this.cartItems.update(items =>
      items.map(item => item.productId === productId ? { ...item, quantity } : item)
    );
    this.cartItemsCount.set(this.calculateCount(this.cartItems()));

    return this.http.put<ResponseModel<boolean> | boolean>(
      `${this.apiUrl}/Update?UserId=${customerId}&productId=${productId}&quantity=${quantity}`,
      null
    ).pipe(
      map(res => unwrapResult(res) === true)
    );
  }

  removeItem(customerId: number, productId: number): Observable<boolean> {
    if (!customerId || customerId <= 0) {
      const items = this.getGuestCart().filter(item => item.productId !== productId);
      this.saveGuestCart(items);
      return of(true);
    }

    // Optimistic local update
    this.cartItems.update(items => items.filter(item => item.productId !== productId));
    this.cartItemsCount.set(this.calculateCount(this.cartItems()));

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
    localStorage.removeItem(this.GUEST_CART_KEY);
    this.currentCart.set(null);
    this.cartItems.set([]);
    this.cartItemsCount.set(0);
  }

  // Tizimga kirganda mehmondagi savatni foydalanuvchiga ko'chirish
  syncGuestCartToUser(userId: number): Observable<boolean> {
    const guestItems = this.getGuestCart();
    if (!guestItems || guestItems.length === 0) {
      return of(true);
    }

    const requests = guestItems.map(item =>
      this.http.post<any>(
        `${this.apiUrl}/AddItemtoCart?UserId=${userId}&productId=${item.productId}&quantity=${item.quantity}`,
        null
      )
    );

    return forkJoin(requests).pipe(
      map(() => {
        localStorage.removeItem(this.GUEST_CART_KEY);
        return true;
      }),
      catchError(() => {
        localStorage.removeItem(this.GUEST_CART_KEY);
        return of(true);
      })
    );
  }
}
