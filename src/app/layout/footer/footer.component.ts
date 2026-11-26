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
      <button type="button" class="help-link" (click)="openHelp($event)">Yordam va aloqa</button>
    </footer>

    <div class="support-modal-overlay" *ngIf="showHelpModal" (click)="closeHelp()">
      <div class="support-modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="footerHelpTitle">
        <div class="support-modal-header">
          <h3 id="footerHelpTitle">💬 Yordam va qo'llab-quvvatlash</h3>
          <button type="button" class="support-close-btn" (click)="closeHelp()" aria-label="Yopish">&times;</button>
        </div>
        <div class="support-modal-body">
          <p class="support-desc">Buyurtmalar, to'lovlar yoki texnik savollar bo'yicha operatorimiz bilan bog'lanishingiz mumkin:</p>
          <div class="support-contact-box">
            <span class="support-handle">&#64;{{ supportUsername }}</span>
            <button type="button" class="support-copy-btn" (click)="copySupportHandle()">
              {{ copied ? '✓ Nusxalandi' : '📋 Nusxalash' }}
            </button>
          </div>
          <p class="support-hours">🕒 Ish vaqti: Har kuni, 09:00 – 21:00</p>
        </div>
        <div class="support-modal-footer">
          <button type="button" class="support-btn-sec" (click)="closeHelp()">Yopish</button>
          <button type="button" class="support-btn-pri" (click)="openTelegramSupport()">✈️ Telegramda yozish ↗</button>
        </div>
      </div>
    </div>
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
      color: var(--text-muted, #475569);
      margin-top: auto;
    }

    .copyright {
      font-weight: 500;
    }

    .help-link {
      color: var(--primary, #4f46e5);
      font-weight: 600;
      font-size: inherit;
      text-decoration: none;
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
      transition: color 0.2s;
    }

    .help-link:hover {
      color: var(--primary-hover, #4338ca);
      text-decoration: underline;
    }

    .support-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1200;
      padding: 1rem;
    }

    .support-modal {
      width: 100%;
      max-width: 420px;
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 16px;
      box-shadow: 0 20px 45px rgba(15, 23, 42, 0.22);
      overflow: hidden;
    }

    .support-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border, #e2e8f0);
    }

    .support-modal-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-main, #0f172a);
    }

    .support-close-btn {
      background: transparent;
      border: none;
      font-size: 1.4rem;
      line-height: 1;
      color: var(--text-muted, #475569);
      cursor: pointer;
    }

    .support-modal-body {
      padding: 1.15rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .support-desc {
      margin: 0;
      font-size: 0.88rem;
      color: var(--text-muted, #475569);
      line-height: 1.5;
    }

    .support-contact-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.7rem 0.9rem;
      background: var(--bg-subtle, #f1f5f9);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 10px;
    }

    .support-handle {
      font-weight: 700;
      color: var(--primary, #4f46e5);
      font-size: 0.92rem;
    }

    .support-copy-btn {
      padding: 0.35rem 0.7rem;
      border-radius: 8px;
      border: 1px solid var(--border, #cbd5e1);
      background: var(--bg-card, #ffffff);
      color: var(--text-main, #0f172a);
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
    }

    .support-hours {
      margin: 0;
      font-size: 0.8rem;
      color: var(--text-muted, #475569);
    }

    .support-modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.65rem;
      padding: 0.9rem 1.25rem;
      border-top: 1px solid var(--border, #e2e8f0);
    }

    .support-btn-sec,
    .support-btn-pri {
      padding: 0.55rem 0.95rem;
      border-radius: 9px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
    }

    .support-btn-sec {
      background: var(--bg-subtle, #f1f5f9);
      border-color: var(--border, #cbd5e1);
      color: var(--text-main, #0f172a);
    }

    .support-btn-pri {
      background: #4f46e5;
      color: #ffffff;
    }

    /* Dark theme */
    :host-context(body.dark-theme) .footer,
    :host-context(.dark-theme) .footer {
      background: #151e32;
      border-color: #22304d;
      color: #94a3b8;
    }

    :host-context(body.dark-theme) .support-modal,
    :host-context(.dark-theme) .support-modal {
      background: #151e32;
      border-color: #22304d;
    }

    :host-context(body.dark-theme) .support-modal-header,
    :host-context(.dark-theme) .support-modal-header,
    :host-context(body.dark-theme) .support-modal-footer,
    :host-context(.dark-theme) .support-modal-footer {
      border-color: #22304d;
    }

    :host-context(body.dark-theme) .support-modal-header h3,
    :host-context(.dark-theme) .support-modal-header h3 {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .support-desc,
    :host-context(.dark-theme) .support-desc,
    :host-context(body.dark-theme) .support-hours,
    :host-context(.dark-theme) .support-hours {
      color: #cbd5e1;
    }

    :host-context(body.dark-theme) .support-contact-box,
    :host-context(.dark-theme) .support-contact-box {
      background: #0f172a;
      border-color: #22304d;
    }

    :host-context(body.dark-theme) .support-copy-btn,
    :host-context(.dark-theme) .support-copy-btn,
    :host-context(body.dark-theme) .support-btn-sec,
    :host-context(.dark-theme) .support-btn-sec {
      background: #1e293b;
      border-color: #334155;
      color: #e2e8f0;
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
  supportUsername = environment.telegramSupportUsername;
  showHelpModal = false;
  copied = false;

  openHelp(event: Event): void {
    event.preventDefault();
    this.copied = false;
    this.showHelpModal = true;
  }

  closeHelp(): void {
    this.showHelpModal = false;
  }

  copySupportHandle(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`@${this.supportUsername}`).then(() => {
        this.copied = true;
      }).catch(() => {});
    }
  }

  openTelegramSupport(): void {
    const telegramUrl = `https://t.me/${this.supportUsername}`;

    if (this.tg.isMiniApp()) {
      this.tg.openTelegramLink(telegramUrl);
    } else {
      window.open(telegramUrl, '_blank', 'noopener,noreferrer');
    }
  }
}
