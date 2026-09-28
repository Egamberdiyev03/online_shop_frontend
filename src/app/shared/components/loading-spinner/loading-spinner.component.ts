import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="spinner-wrapper" [class.overlay]="overlay">
      <div class="spinner" [style.width.px]="size" [style.height.px]="size"></div>
      <p class="spinner-text" *ngIf="message">{{ message }}</p>
    </div>
  `,
  styles: [`
    .spinner-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1rem;
      gap: 1rem;
    }
    .spinner-wrapper.overlay {
      position: absolute;
      inset: 0;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(2px);
      z-index: 50;
    }
    .spinner {
      border: 3px solid var(--border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .spinner-text {
      font-size: 0.875rem;
      color: var(--text-muted);
      font-weight: 500;
    }
  `]
})
export class LoadingSpinnerComponent {
  @Input() size: number = 36;
  @Input() message: string = 'Yuklanmoqda...';
  @Input() overlay: boolean = false;
}
