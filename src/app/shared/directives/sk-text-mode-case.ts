import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  Optional,
  Self,
} from '@angular/core';
import { NgControl } from '@angular/forms';

import { NameCasingMode } from '@shared/interfaces/central.interfaces';

@Directive({
  selector: '[skTextCase]',
  standalone: true,
})
export class SkTextCaseDirective {
  @Input('skTextCase')
  mode: NameCasingMode = 'normal';

  constructor(
    private elementRef: ElementRef<HTMLInputElement>,
    @Optional() @Self() private ngControl: NgControl,
  ) {}

  @HostListener('input')
  onInput(): void {
    const input = this.elementRef.nativeElement;

    const start = input.selectionStart;
    const end = input.selectionEnd;

    const originalValue = input.value ?? '';
    const transformedValue = this.transform(originalValue);

    if (originalValue === transformedValue) {
      return;
    }

    input.value = transformedValue;

    this.ngControl?.control?.setValue(transformedValue, {
      emitEvent: false,
      emitModelToViewChange: false,
      emitViewToModelChange: false,
    });

    if (start !== null && end !== null) {
      input.setSelectionRange(start, end);
    }
  }

  private transform(value: string): string {
    switch (this.mode) {
      case 'uppercase':
        return value.toLocaleUpperCase('es-MX');

      case 'capital':
        return this.capitalize(value);

      case 'normal':
      default:
        return value;
    }
  }

  private capitalize(value: string): string {
    return value
      .toLocaleLowerCase('es-MX')
      .replace(/(^|[\s.\-'\u2019])(\p{L})/gu, (_, separator: string, letter: string) => {
        return separator + letter.toLocaleUpperCase('es-MX');
      });
  }
}