import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaService } from '../../../core/services/pwa.service';

@Component({
  selector: 'app-pwa-install-prompt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pwa-install-prompt.component.html',
  styleUrl: './pwa-install-prompt.component.css'
})
export class PwaInstallPromptComponent {
  public pwa = inject(PwaService);
  public dismissed = signal<boolean>(false);
  public showIosGuide = signal<boolean>(false);

  constructor() {
    // Check if user dismissed before (this session)
    const dismissedKey = 'pwa_install_dismissed';
    if (typeof sessionStorage !== 'undefined') {
      this.dismissed.set(sessionStorage.getItem(dismissedKey) === 'true');
    }
  }

  get shouldShow(): boolean {
    if (this.dismissed()) return false;
    if (this.pwa.isInstalled() || this.pwa.isStandalone()) return false;
    return this.pwa.canInstall() || this.pwa.shouldShowIosInstallGuide();
  }

  async install(): Promise<void> {
    if (this.pwa.platform() === 'ios') {
      this.showIosGuide.set(true);
      return;
    }
    await this.pwa.promptInstall();
  }

  dismiss(): void {
    this.dismissed.set(true);
    this.showIosGuide.set(false);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('pwa_install_dismissed', 'true');
    }
  }

  closeIosGuide(): void {
    this.showIosGuide.set(false);
  }
}
