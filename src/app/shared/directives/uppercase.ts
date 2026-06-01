import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[skUppercase]',
  standalone: true
})
export class SkUppercaseDirective {

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input) return;

    let value = input.value || '';

    // Transformación: mayúsculas + solo A-Z y números (ideal para TIN/RFC)
    value = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    const start = input.selectionStart;
    const end = input.selectionEnd;

    input.value = value;

    if (start !== null && end !== null) {
      input.setSelectionRange(start, end);
    }
  }
}
