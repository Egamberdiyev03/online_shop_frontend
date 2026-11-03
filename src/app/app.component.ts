import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './layout/navbar/navbar.component';
import { FooterComponent } from './layout/footer/footer.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { AuthService } from './core/services/auth.service';
import { AuthStateService } from './core/services/auth-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'OnlineShop-Frontend';

  private authService = inject(AuthService);
  private authState = inject(AuthStateService);

  ngOnInit(): void {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (!tg) return; // oddiy brauzer, hech narsa o'zgarmaydi

      tg.ready?.();
      tg.expand?.();

      // Mini App ichida va hali kirmagan bo'lsa, avtomatik kiramiz
      if (tg.initData && !this.authState.isAuthenticated()) {
        this.authService.telegramMiniAppLogin(tg.initData).subscribe({
          error: err => console.warn('Mini App login:', err?.message ?? err)
        });
      }
    } catch (e) {
      console.warn('Telegram WebApp init warning:', e);
    }
  }
}
