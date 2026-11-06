import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './layout/navbar/navbar.component';
import { FooterComponent } from './layout/footer/footer.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { BottomNavComponent } from './layout/bottom-nav/bottom-nav.component';
import { AuthService } from './core/services/auth.service';
import { AuthStateService } from './core/services/auth-state.service';
import { TelegramService } from './core/services/telegram.service';
import { BackButtonService } from './core/services/back-button.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent, ToastComponent, BottomNavComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'OnlineShop-Frontend';

  private authService = inject(AuthService);
  private authState = inject(AuthStateService);
  tg = inject(TelegramService);
  private backButton = inject(BackButtonService); // Telegram BackButton boshqaruvi

  ngOnInit(): void {
    try {
      const tgApp = this.tg.webApp;
      if (!tgApp) return;

      tgApp.ready?.();
      tgApp.expand?.();

      // Mini App ichida va hali kirmagan bo'lsa, avtomatik kiramiz
      if (tgApp.initData && !this.authState.isAuthenticated()) {
        this.authService.telegramMiniAppLogin(tgApp.initData).subscribe({
          error: err => console.warn('Mini App login:', err?.message ?? err)
        });
      }
    } catch (e) {
      console.warn('Telegram WebApp init warning:', e);
    }
  }
}
