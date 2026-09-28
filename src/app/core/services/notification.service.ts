import { Injectable, signal } from '@angular/core';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toastsSignal = signal<ToastNotification[]>([]);
  public toasts = this.toastsSignal.asReadonly();

  show(type: 'success' | 'error' | 'info' | 'warning', message: string, title?: string): void {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: ToastNotification = { id, type, message, title };

    this.toastsSignal.update(list => [...list, toast]);

    setTimeout(() => {
      this.remove(id);
    }, 4500);
  }

  success(message: string, title = 'Muvaffaqiyatli'): void {
    this.show('success', message, title);
  }

  error(message: string, title = 'Xatolik'): void {
    this.show('error', message, title);
  }

  info(message: string, title = "Ma'lumot"): void {
    this.show('info', message, title);
  }

  warning(message: string, title = 'Ogohlantirish'): void {
    this.show('warning', message, title);
  }

  remove(id: string): void {
    this.toastsSignal.update(list => list.filter(t => t.id !== id));
  }
}
