import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="star-rating" [class.interactive]="!readonly">
      <span 
        *ngFor="let star of [1, 2, 3, 4, 5]" 
        class="star"
        [class.filled]="star <= (hoverRating || rating)"
        (mouseenter)="!readonly && onHover(star)"
        (mouseleave)="!readonly && onHover(0)"
        (click)="!readonly && onSelect(star)"
      >
        ★
      </span>
      <span class="rating-value" *ngIf="showValue && rating > 0">
        {{ rating | number:'1.1-1' }}
      </span>
    </div>
  `,
  styles: [`
    .star-rating {
      display: inline-flex;
      align-items: center;
      gap: 0.125rem;
      user-select: none;
    }
    .star {
      font-size: 1.125rem;
      color: #cbd5e1;
      transition: color 0.15s ease;
    }
    .star.filled {
      color: #f59e0b;
    }
    .interactive .star {
      cursor: pointer;
    }
    .interactive .star:hover {
      transform: scale(1.15);
    }
    .rating-value {
      margin-left: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--text-main);
    }
  `]
})
export class StarRatingComponent {
  @Input() rating: number = 0;
  @Input() readonly: boolean = true;
  @Input() showValue: boolean = false;
  @Output() ratingChange = new EventEmitter<number>();

  hoverRating: number = 0;

  onHover(star: number): void {
    this.hoverRating = star;
  }

  onSelect(star: number): void {
    this.rating = star;
    this.ratingChange.emit(star);
  }
}
