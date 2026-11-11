import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { TelegramService } from '../../core/services/telegram.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="footer">
      <span class="copyright">© {{ currentYear }} OnlineShop</span>
      <a href="#" class="help-link" (click)="openHelp($event)">Yordam va aloqa</a>
    </footer>
  `,
  styles: [`
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      background: var(--bg-card, #ffffff);
      border-top: 1px solid var(--border, #e2e8f0);
      font-size: 0.8125rem;
      color: var(--text-muted, #64748b);
      margin-top: auto;
    }

    .copyright {
      font-weight: 500;
    }

    .help-link {
      color: var(--primary, #6366f1);
      font-weight: 600;
      text-decoration: none;
      transition: color 0.2s;
    }

    .help-link:hover {
      color: var(--primary-hover, #4f46e5);
      text-decoration: underline;
    }

    /* Dark theme */
    :host-context(body.dark-theme) .footer,
    :host-context(.dark-theme) .footer {
      background: #151e32;
      border-color: #22304d;
      color: #94a3b8;
    }

    /* Mobile */
    @media (max-width: 480px) {
      .footer {
        padding: 0.875rem 1rem;
        font-size: 0.75rem;
      }
    }
  `]
})
export class FooterComponent {
  private tg = inject(TelegramService);

  currentYear = new Date().getFullYear();

  openHelp(event: Event): void {
    event.preventDefault();
    const telegramUrl = `https://t.me/${environment.telegramSupportUsername}`;

    if (this.tg.isMiniApp()) {
      this.tg.openTelegramLink(telegramUrl);
    } else {
      window.open(telegramUrl, '_blank');
    }
  }
}
