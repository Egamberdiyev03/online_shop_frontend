import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurierShortDto, TransportTypeLabels, TransportTypeIcons } from '../../../core/models/curier.model';
import { ImageUrlPipe } from '../../pipes/image-url.pipe';

@Component({
  selector: 'app-curier-info-card',
  standalone: true,
  imports: [CommonModule, ImageUrlPipe],
  templateUrl: './curier-info-card.component.html',
  styleUrl: './curier-info-card.component.css'
})
export class CurierInfoCardComponent {
  @Input() curier: CurierShortDto | null = null;
  @Input() showCallButton = true;
  @Input() compact = false;
  @Input() showStatus = false;
  @Input() isOnline = false;
  @Output() call = new EventEmitter<string>();

  avatarBroken = signal(false);

  getInitials(name?: string): string {
    const trimmed = (name || '').trim();
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (trimmed.slice(0, 2) || 'K').toUpperCase();
  }

  getTransportLabel(type: number): string {
    return TransportTypeLabels[type] || "Noma'lum";
  }

  getTransportIcon(type: number): string {
    return TransportTypeIcons[type] || '';
  }

  onCall(): void {
    if (this.curier?.phoneNumber) {
      this.call.emit(this.curier.phoneNumber);
    }
  }

  onAvatarError(): void {
    this.avatarBroken.set(true);
  }
}
