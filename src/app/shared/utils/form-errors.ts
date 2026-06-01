import { AbstractControl } from '@angular/forms';

export const FORM_ERROR_MESSAGES: Record<string, (error?: any) => string> = {
  required: () => 'Este campo es requerido',
  email: () => 'Correo no válido',
  minlength: (e) => `Mínimo ${e.requiredLength} caracteres`,
  maxlength: (e) => `Máximo ${e.requiredLength} caracteres`,
  server: (e) => e,
};

export function getControlError(control: AbstractControl | null): string | null {
  if (!control || !control.errors || !(control.touched || control.dirty)) {
    return null;
  }

  for (const key of Object.keys(control.errors)) {
    const error = control.errors[key];
    const mapper = FORM_ERROR_MESSAGES[key];

    if (mapper) {
      return mapper(error);
    }
  }

  return null;
}