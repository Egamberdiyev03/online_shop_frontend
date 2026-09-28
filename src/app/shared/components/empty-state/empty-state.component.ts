import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty-state">
      <div class="empty-icon">{{ icon }}</div>
      <h3 class="empty-title">{{ title }}</h3>
      <p class="empty-desc" *ngIf="description">{{ description }}</p>
      <button 
        *ngIf="actionText" 
        class="btn btn-primary btn-sm" 
        (click)="actionClick.emit()"
      >
        {{ actionText }}
      </button>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 3.5rem 1.5rem;
      background: #ffffff;
      border: 1px dashed var(--border);
      border-radius: var(--radius-lg);
      margin: 1rem 0;
    }
    .empty-icon {
      font-size: 3rem;
      margin-bottom: 0.75rem;
      color: var(--text-light);
    }
    .empty-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 0.375rem;
    }
    .empty-desc {
      font-size: 0.875rem;
      color: var(--text-muted);
      max-width: 360px;
      margin-bottom: 1.25rem;
    }
  `]
})
export class EmptyStateComponent {
  @Input() icon: string = '📦';
  @Input() title: string = "Ma'lumot topilmadi";
  @Input() description: string = "Hozircha hech qanday ma'lumot mavjud emas.";
  @Input() actionText?: string;
  @Output() actionClick = new EventEmitter<void>();
}
