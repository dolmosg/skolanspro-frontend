import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phoneFormat',
  standalone: true,
})
export class PhoneFormatPipe implements PipeTransform {
  transform(value: string | number | null | undefined, countryCode?: string | null): string {
    const raw = String(value ?? '').trim();

    if (!raw) {
      return '';
    }

    const digits = raw.replace(/\D/g, '');

    if (!digits) {
      return raw;
    }

    const formatted = this.formatByLength(digits);

    if (!countryCode) {
      return formatted;
    }

    const cleanCountryCode = String(countryCode).replace(/^\+/, '').trim();

    return `+${cleanCountryCode} ${formatted}`;
  }

  private formatByLength(digits: string): string {
    if (digits.length === 10) {
      return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
    }

    if (digits.length === 8) {
      return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    }

    if (digits.length === 7) {
      return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    }

    return digits;
  }
}