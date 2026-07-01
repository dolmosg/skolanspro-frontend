import { Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { getControlError } from '../../utils/form-errors';

@Component({
  selector: 'form-error',
  standalone: true,
  template: `
    <div class="form-error" [class.form-error--empty]="!message">
      @if (message) {
        <span class="form-error__icon">⚠</span>
        <span class="form-error__text">{{ message }}</span>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .form-error {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        margin-top: 4px;
        font-size: 12px;
        color: #e55353;
        line-height: 1.3;
        opacity: 0;
        transform: translateY(-2px);
        animation: formErrorFadeIn 0.2s ease forwards;
        min-height: 20px;
      }

      .form-error__icon {
        font-size: 12px;
        margin-top: 1px;
        flex-shrink: 0;
      }

      .form-error__text {
        line-height: 1.3;
      }

      .form-error--empty {
        visibility: hidden;
      }

      @keyframes formErrorFadeIn {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class FormErrorComponent {
  @Input() control!: AbstractControl | null;

  get message(): string | null {
    return getControlError(this.control);
  }
}
