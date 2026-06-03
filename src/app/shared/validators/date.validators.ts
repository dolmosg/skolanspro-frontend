import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

export class DateValidators {
  /**
   * Valida que la fecha sea >= min y <= max
   */
  static range(
    min?: string | null,
    max?: string | null,
  ): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = this.toDateOnly(control.value);

      if (!value) {
        return null;
      }

      const minDate = this.toDateOnly(min);
      const maxDate = this.toDateOnly(max);

      if (minDate && value < minDate) {
        return {
          dateMinimum: {
            requiredDate: minDate,
            actualDate: value,
          },
        };
      }

      if (maxDate && value > maxDate) {
        return {
          dateMaximum: {
            requiredDate: maxDate,
            actualDate: value,
          },
        };
      }

      return null;
    };
  }

  /**
   * Valida que una fecha sea posterior a otra fecha del mismo formulario
   *
   * Ejemplo:
   * validators: [
   *   DateValidators.after('start_date')
   * ]
   */
  static after(
    fieldName: string,
    errorKey = 'dateAfter',
  ): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const currentValue = this.toDateOnly(
        control.get('end_date')?.value,
      );

      const compareValue = this.toDateOnly(
        control.get(fieldName)?.value,
      );

      if (!currentValue || !compareValue) {
        return null;
      }

      if (currentValue <= compareValue) {
        return {
          [errorKey]: {
            compareField: fieldName,
            actualDate: currentValue,
            requiredDate: compareValue,
          },
        };
      }

      return null;
    };
  }

  /**
   * Valida que una fecha sea >= min
   */
  static minimum(
    min: string,
  ): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = this.toDateOnly(control.value);

      if (!value) {
        return null;
      }

      const minDate = this.toDateOnly(min);

      return value < minDate
        ? {
            dateMinimum: {
              requiredDate: minDate,
              actualDate: value,
            },
          }
        : null;
    };
  }

  /**
   * Valida que una fecha sea <= max
   */
  static maximum(
    max: string,
  ): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = this.toDateOnly(control.value);

      if (!value) {
        return null;
      }

      const maxDate = this.toDateOnly(max);

      return value > maxDate
        ? {
            dateMaximum: {
              requiredDate: maxDate,
              actualDate: value,
            },
          }
        : null;
    };
  }

  private static toDateOnly(
    value: string | null | undefined,
  ): string {
    return value ? value.slice(0, 10) : '';
  }
}