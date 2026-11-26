import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { CurierService } from '../../../core/services/curier.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CreateCurierDto, TransportType, TransportTypeLabels } from '../../../core/models/curier.model';

@Component({
  selector: 'app-curier-apply',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './curier-apply.component.html',
  styleUrl: './curier-apply.component.css'
})
export class CurierApplyComponent {
  private curierService = inject(CurierService);
  private notification = inject(NotificationService);
  private router = inject(Router);

  loading = signal(false);
  submitted = signal(false);

  vehicleType: TransportType = TransportType.Foot;
  license = '';
  selectedPhotoFile: File | null = null;
  photoPreviewUrl = signal<string | null>(null);
  photoError = signal<string | null>(null);

  transportTypes = [
    { value: TransportType.Foot, label: TransportTypeLabels[0], icon: '🚶' },
    { value: TransportType.Car, label: TransportTypeLabels[1], icon: '🚗' },
    { value: TransportType.Motorcycle, label: TransportTypeLabels[2], icon: '🏍️' },
    { value: TransportType.Bicycle, label: TransportTypeLabels[3], icon: '🚴' }
  ];

  get requiresLicense(): boolean {
    const v = Number(this.vehicleType);
    return v === TransportType.Car || v === TransportType.Motorcycle;
  }

  onVehicleTypeChange(val: TransportType | number | string): void {
    this.vehicleType = Number(val) as TransportType;
    if (!this.requiresLicense) {
      this.license = '';
    }
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    this.photoError.set(null);
    if (!file) return;

    const allowedExt = ['.jpg', '.jpeg', '.png', '.webp'];
    const lower = file.name.toLowerCase();
    if (!allowedExt.some(ext => lower.endsWith(ext)) || !file.type.startsWith('image/')) {
      const msg = 'Faqat .jpg, .jpeg, .png, .webp rasmlar qabul qilinadi!';
      this.photoError.set(msg);
      this.notification.error(msg);
      input.value = '';
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      const msg = 'Rasm hajmi 3MB dan oshmasligi kerak!';
      this.photoError.set(msg);
      this.notification.error(msg);
      input.value = '';
      return;
    }

    this.selectedPhotoFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreviewUrl.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  removePhoto(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.selectedPhotoFile = null;
    this.photoPreviewUrl.set(null);
    this.photoError.set(null);
  }

  submit(): void {
    if (this.loading()) return;
    if (this.requiresLicense && !this.license.trim()) {
      this.notification.warning('Avtomobil va mototsikl uchun guvohnoma raqamini kiriting!');
      return;
    }
    if (this.photoError()) {
      this.notification.error(this.photoError()!);
      return;
    }
    this.loading.set(true);

    const upload$ = this.selectedPhotoFile
      ? this.curierService.uploadPhoto(this.selectedPhotoFile)
      : of('');

    upload$.pipe(
      switchMap((uploadedUrl) => {
        const dto: CreateCurierDto = {
          vehicleType: Number(this.vehicleType) as TransportType,
          license: this.requiresLicense ? (this.license.trim() || undefined) : undefined,
          profilePictureUrl: uploadedUrl || ''
        };
        return this.curierService.apply(dto);
      })
    ).subscribe({
      next: () => {
        this.submitted.set(true);
        this.loading.set(false);
        this.notification.success('Ariza yuborildi! Tasdiqlanishini kuting.');
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Xatolik yuz berdi';
        this.notification.error(msg);
        this.loading.set(false);
      }
    });
  }

  goHome(): void {
    this.router.navigate(['/products']);
  }
}
