import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({
  name: 'imageUrl',
  standalone: true
})
export class ImageUrlPipe implements PipeTransform {
  private readonly placeholderUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23f1f5f9" width="200" height="200"/%3E%3Ctext fill="%2394a3b8" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ERasm yo%27q%3C/text%3E%3C/svg%3E';

  transform(value: string | null | undefined, fallback?: string): string {
    if (!value) {
      return fallback || this.placeholderUrl;
    }

    // Agar "http" yoki "https" bilan boshlansa - to'liq URL
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }

    // Agar "data:" bilan boshlansa (base64 yoki svg)
    if (value.startsWith('data:')) {
      return value;
    }

    // Nisbiy yo'l - environment.apiUrl ni qo'shish
    // Agar value "/" bilan boshlanmasa, qo'shish
    const path = value.startsWith('/') ? value : `/${value}`;
    return `${environment.apiUrl}${path}`;
  }
}
