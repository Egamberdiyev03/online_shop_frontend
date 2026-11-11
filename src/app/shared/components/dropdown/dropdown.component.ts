import {
  Component,
  HostListener,
  ElementRef,
  inject,
  ChangeDetectionStrategy,
  signal,
  computed,
  input,
  output
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DropdownOption {
  value: string | number;
  label: string;
}

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dropdown-wrapper" [class.open]="open()" [class.active]="isActive()">
      <!-- Asosiy trigger tugmasi -->
      <button
        type="button"
        class="dropdown-trigger"
        (click)="toggle()"
        (keydown)="onTriggerKeydown($event)"
        [attr.aria-expanded]="open()"
        [attr.aria-haspopup]="'listbox'"
        [title]="text()"
      >
        @if (icon()) {
          <span class="trigger-icon">{{ icon() }}</span>
        }
        <span class="trigger-label">{{ text() }}</span>
        <svg class="trigger-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      <!-- × tugmasi - faqat allLabel berilgan va qiymat tanlangan bo'lsa -->
      @if (isActive()) {
        <button
          type="button"
          class="clear-btn"
          (click)="clear($event)"
          (keydown)="onClearKeydown($event)"
          aria-label="Tanlovni bekor qilish"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      }

      <!-- Dropdown menu -->
      @if (open()) {
        <ul
          class="dropdown-menu"
          role="listbox"
          (keydown)="onMenuKeydown($event)"
        >
          <!-- "Barcha ..." band - faqat allLabel berilgan bo'lsa -->
          @if (allLabel()) {
            <li
              class="dropdown-option"
              [class.selected]="selected() === null"
              role="option"
              [attr.aria-selected]="selected() === null"
              (click)="select(null)"
            >
              <span class="option-label">{{ allLabel() }}</span>
              @if (selected() === null) {
                <svg class="option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              }
            </li>
          }

          @for (o of options(); track o.value) {
            <li
              class="dropdown-option"
              [class.selected]="selected()?.value === o.value"
              role="option"
              [attr.aria-selected]="selected()?.value === o.value"
              [title]="o.label"
              (click)="select(o.value)"
            >
              <span class="option-label">{{ o.label }}</span>
              @if (selected()?.value === o.value) {
                <svg class="option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              }
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .dropdown-wrapper {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .dropdown-trigger {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.875rem;
      background: var(--bg-subtle, #f1f5f9);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 10px;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 120px;
      max-width: 200px;
      text-align: left;
    }

    .dropdown-trigger:hover {
      border-color: var(--primary, #6366f1);
      background: var(--bg-card, #ffffff);
    }

    .dropdown-trigger:focus {
      outline: none;
      border-color: var(--primary, #6366f1);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }

    .dropdown-wrapper.open .dropdown-trigger {
      border-color: var(--primary, #6366f1);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }

    /* Active state - qiymat tanlangan */
    .dropdown-wrapper.active .dropdown-trigger {
      background: #1d1b4b;
      border-color: var(--primary, #6366f1);
      color: #e0e7ff;
    }

    .dropdown-wrapper.active .dropdown-trigger:hover {
      background: #2d2a6e;
    }

    .dropdown-wrapper.active .trigger-icon {
      opacity: 0.85;
    }

    .dropdown-wrapper.active .trigger-chevron {
      color: #a5b4fc;
    }

    .trigger-icon {
      font-size: 1rem;
      line-height: 1;
      flex-shrink: 0;
    }

    .trigger-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }

    .trigger-chevron {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      transition: transform 0.2s ease;
      color: var(--text-muted, #64748b);
    }

    .dropdown-wrapper.open .trigger-chevron {
      transform: rotate(180deg);
    }

    /* Clear button - alohida qardosh element */
    .clear-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      padding: 0;
      background: #312e81;
      border: none;
      border-radius: 50%;
      color: #c7d2fe;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .clear-btn:hover {
      background: #ef4444;
      color: white;
    }

    .clear-btn:focus {
      outline: none;
      background: #ef4444;
      color: white;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.3);
    }

    .clear-btn svg {
      width: 12px;
      height: 12px;
    }

    .dropdown-menu {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      min-width: 100%;
      max-width: 280px;
      max-height: 280px;
      overflow-y: auto;
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 12px;
      padding: 0.375rem;
      margin: 0;
      list-style: none;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
      z-index: 100;
      animation: dropdownSlide 0.15s ease-out;
    }

    @keyframes dropdownSlide {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .dropdown-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      font-size: 0.875rem;
      color: var(--text-primary, #0f172a);
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .dropdown-option:hover {
      background: var(--bg-subtle, #f1f5f9);
    }

    .dropdown-option.selected {
      background: var(--primary-light, #eef2ff);
      color: var(--primary, #6366f1);
    }

    .option-label {
      flex: 1;
      min-width: 0;
      line-height: 1.4;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .option-check {
      width: 16px;
      height: 16px;
      color: var(--primary, #6366f1);
      flex-shrink: 0;
    }

    /* Dark theme */
    :host-context(body.dark-theme) .dropdown-trigger,
    :host-context(.dark-theme) .dropdown-trigger {
      background: #1e293b;
      border-color: #334155;
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .dropdown-trigger:hover,
    :host-context(.dark-theme) .dropdown-trigger:hover {
      background: #334155;
      border-color: #6366f1;
    }

    :host-context(body.dark-theme) .dropdown-wrapper.active .dropdown-trigger,
    :host-context(.dark-theme) .dropdown-wrapper.active .dropdown-trigger {
      background: #1d1b4b;
      border-color: #6366f1;
      color: #e0e7ff;
    }

    :host-context(body.dark-theme) .dropdown-wrapper.active .dropdown-trigger:hover,
    :host-context(.dark-theme) .dropdown-wrapper.active .dropdown-trigger:hover {
      background: #2d2a6e;
    }

    :host-context(body.dark-theme) .clear-btn,
    :host-context(.dark-theme) .clear-btn {
      background: #312e81;
      color: #a5b4fc;
    }

    :host-context(body.dark-theme) .dropdown-menu,
    :host-context(.dark-theme) .dropdown-menu {
      background: #151e32;
      border-color: #22304d;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    }

    :host-context(body.dark-theme) .dropdown-option,
    :host-context(.dark-theme) .dropdown-option {
      color: #e2e8f0;
    }

    :host-context(body.dark-theme) .dropdown-option:hover,
    :host-context(.dark-theme) .dropdown-option:hover {
      background: #1e293b;
    }

    :host-context(body.dark-theme) .dropdown-option.selected,
    :host-context(.dark-theme) .dropdown-option.selected {
      background: #312e81;
      color: #a5b4fc;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .dropdown-trigger {
        min-width: 100px;
        max-width: 160px;
        padding: 0.5rem 0.75rem;
        font-size: 0.8125rem;
      }

      .dropdown-menu {
        max-height: 240px;
        max-width: 240px;
      }
    }
  `]
})
export class DropdownComponent {
  private elementRef = inject(ElementRef);

  // Signal inputs
  icon = input<string>();
  options = input.required<DropdownOption[]>();
  value = input<string | number | null>(null);
  /** Berilsa: birinchi band "Barcha ..." bo'ladi, tanlov bekor qilinadi (null), × chiqadi. Berilmasa: × yo'q. */
  allLabel = input<string | null>(null);

  // Output
  valueChange = output<string | number | null>();

  // State
  open = signal(false);

  /**
   * BITTA manba: tugma ham, ro'yxat ham shuni ishlatadi.
   * Turlardan qat'i nazar String() bilan solishtiradi.
   */
  selected = computed(() => {
    const v = this.value();
    if (v === null || v === undefined || v === '') return null;
    return this.options().find(o => String(o.value) === String(v)) ?? null;
  });

  text = computed(() => this.selected()?.label ?? this.allLabel() ?? '');

  /** × va faol stil faqat allLabel berilgan VA qiymat tanlangan bo'lsa */
  isActive = computed(() => this.allLabel() !== null && this.selected() !== null);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.open.set(false);
  }

  toggle(): void {
    this.open.update(v => !v);
  }

  select(v: string | number | null): void {
    this.valueChange.emit(v);
    this.open.set(false);
  }

  clear(event: Event): void {
    event.stopPropagation();
    this.valueChange.emit(null);
    // Ro'yxat ochilmasin
  }

  onClearKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.stopPropagation();
      event.preventDefault();
      this.valueChange.emit(null);
    }
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.open.set(true);
    }
  }

  onMenuKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.open.set(false);
    }
  }
}
