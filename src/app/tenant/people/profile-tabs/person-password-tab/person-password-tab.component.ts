import { CommonModule } from '@angular/common';
import { Component, input, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

interface IUser {
  id: number;
  email: string;
  active: boolean;
}

@Component({
  selector: 'app-person-password-tab',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, UiIconComponent],
  templateUrl: './person-password-tab.component.html',
  styleUrl: './person-password-tab.component.scss',
})
export class PersonPasswordTabComponent extends SkolansBaseComponent {
  protected readonly showPassword = signal(false);
  protected readonly showPasswordConfirmation = signal(false);
  private readonly fb = inject(FormBuilder);

  readonly user = input<IUser | null>(null);
  readonly route = input<string | null>(null);

  protected togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  protected togglePasswordConfirmationVisibility(): void {
    this.showPasswordConfirmation.update((value) => !value);
  }

  protected readonly form = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', [Validators.required]],
    },
    {
      validators: [this.passwordsMatchValidator],
    },
  );

  protected get password(): AbstractControl | null {
    return this.form.get('password');
  }

  protected get passwordConfirmation(): AbstractControl | null {
    return this.form.get('password_confirmation');
  }

  protected cancel(): void {
    this.form.reset();
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  protected submit(): void {
    const route = this.route();

    if (!route || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.executeMutationRequest(this.api.put(route, this.form.getRawValue()), () => {
      this.cancel();
    });
  }

  private passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmation = control.get('password_confirmation')?.value;

    if (!password || !confirmation) {
      return null;
    }

    return password === confirmation ? null : { passwordsMismatch: true };
  }
}
