import { Pipe, PipeTransform } from '@angular/core';

/**
 * UZS Currency Pipe - O'zbek so'mini formatlash uchun
 *
 * Ishlatish:
 * {{ 1500000 | uzsCurrency }}           → "1 500 000 so'm"
 * {{ 1500000 | uzsCurrency:'short' }}   → "1.5 mln"
 * {{ 1500000 | uzsCurrency:'compact' }} → "1,5M"
 */
@Pipe({
  name: 'uzsCurrency',
  standalone: true
})
export class UzsCurrencyPipe implements PipeTransform {
  transform(
    value: number | null | undefined,
    format: 'full' | 'short' | 'compact' = 'full'
  ): string {
    if (value == null || isNaN(value)) {
      return "0 so'm";
    }

    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    switch (format) {
      case 'short':
        return sign + this.formatShort(absValue);
      case 'compact':
        return sign + this.formatCompact(absValue);
      default:
        return sign + this.formatFull(absValue);
    }
  }

  private formatFull(value: number): string {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value) + " so'm";
  }

  private formatShort(value: number): string {
    if (value >= 1_000_000_000) {
      return (value / 1_000_000_000).toFixed(1).replace('.0', '') + ' mlrd';
    }
    if (value >= 1_000_000) {
      return (value / 1_000_000).toFixed(1).replace('.0', '') + ' mln';
    }
    if (value >= 1_000) {
      return (value / 1_000).toFixed(1).replace('.0', '') + ' ming';
    }
    return value.toString() + " so'm";
  }

  private formatCompact(value: number): string {
    if (value >= 1_000_000_000) {
      return (value / 1_000_000_000).toFixed(1).replace('.', ',') + 'B';
    }
    if (value >= 1_000_000) {
      return (value / 1_000_000).toFixed(1).replace('.', ',') + 'M';
    }
    if (value >= 1_000) {
      return (value / 1_000).toFixed(1).replace('.', ',') + 'K';
    }
    return value.toString();
  }
}
