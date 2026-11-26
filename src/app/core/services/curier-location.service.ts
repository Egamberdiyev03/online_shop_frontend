import { Injectable, inject, signal, effect, OnDestroy } from '@angular/core';
import { CurierService } from './curier.service';
import { AuthStateService } from './auth-state.service';
import { NotificationService } from './notification.service';
import { CurierResponseDto } from '../models/curier.model';

@Injectable({
  providedIn: 'root'
})
export class CurierLocationService implements OnDestroy {
  private curierService = inject(CurierService);
  private authState = inject(AuthStateService);
  private notification = inject(NotificationService);

  private locationTimer: any = null;
  private permissionWarned = false;

  public isTracking = signal<boolean>(false);
  public lastCoords = signal<{ latitude: number; longitude: number } | null>(null);
  public lastSentAt = signal<Date | null>(null);

  constructor() {
    effect(() => {
      const isAuth = this.authState.isAuthenticated();
      const isCurier = this.authState.isCurier();

      if (isAuth && isCurier) {
        this.curierService.getMyProfile().subscribe({
          next: (p) => this.syncFromProfile(p),
          error: () => this.stopTracking()
        });
      } else {
        this.curierService.clearProfile();
        this.stopTracking();
      }
    });
  }

  syncFromProfile(profile: CurierResponseDto | null | undefined): void {
    if (profile && profile.isActive && profile.isOnline) {
      this.startTracking();
    } else {
      this.stopTracking();
    }
  }

  startTracking(): void {
    if (this.locationTimer) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    this.isTracking.set(true);
    this.sendCurrentLocation();
    this.locationTimer = setInterval(() => this.sendCurrentLocation(), 15000);
  }

  stopTracking(): void {
    if (this.locationTimer) {
      clearInterval(this.locationTimer);
      this.locationTimer = null;
    }
    this.isTracking.set(false);
    this.permissionWarned = false;
  }

  private sendCurrentLocation(): void {
    if (!this.authState.isAuthenticated() || !this.authState.isCurier()) {
      this.stopTracking();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.permissionWarned = false;
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        };
        this.lastCoords.set(coords);
        this.curierService.updateLocation(coords).subscribe({
          next: () => this.lastSentAt.set(new Date()),
          error: () => {}
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          if (!this.permissionWarned) {
            this.permissionWarned = true;
            this.notification.warning('Joylashuvga ruxsat bering');
          }
          this.stopTracking();
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  ngOnDestroy(): void {
    this.stopTracking();
  }
}
