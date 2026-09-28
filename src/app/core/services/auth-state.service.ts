import { Injectable, signal } from '@angular/core';
import { Customer } from '../models/customer.model';

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private readonly CUSTOMER_ID_KEY = 'online_shop_active_customer_id';
  private readonly ADMIN_MODE_KEY = 'online_shop_admin_mode';

  currentCustomerId = signal<number>(this.getInitialCustomerId());
  currentCustomer = signal<Customer | null>(null);
  isAdminMode = signal<boolean>(this.getInitialAdminMode());

  constructor() {}

  private getInitialCustomerId(): number {
    const saved = localStorage.getItem(this.CUSTOMER_ID_KEY);
    return saved ? parseInt(saved, 10) : 1;
  }

  private getInitialAdminMode(): boolean {
    return localStorage.getItem(this.ADMIN_MODE_KEY) === 'true';
  }

  setCustomer(customer: Customer): void {
    this.currentCustomer.set(customer);
    this.currentCustomerId.set(customer.id);
    localStorage.setItem(this.CUSTOMER_ID_KEY, customer.id.toString());
  }

  setCustomerId(id: number): void {
    this.currentCustomerId.set(id);
    localStorage.setItem(this.CUSTOMER_ID_KEY, id.toString());
  }

  toggleAdminMode(): void {
    const next = !this.isAdminMode();
    this.isAdminMode.set(next);
    localStorage.setItem(this.ADMIN_MODE_KEY, String(next));
  }
}
