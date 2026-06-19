import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../shared/services/api-service';
import { SiteStateService } from '../../../shared/services/site-state';
import { AuthStateSevice } from '../../../shared/services/auth-state-sevice';
import { UiIconComponent } from '../../../shared/ui/ui-icon/ui-icon';
import { FormErrorComponent } from '../../../shared/ui/form-error/form-error';

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginRole {
  id: number;
  name: string;
  translation?: string;
  path?: string;
  help?: string;
  created_at?: string;
  updated_at?: string;
}

interface LoginData {
  token?: string;
  user?: {
    id: number;
    name: string;
    email: string;
    initials?: string;
    role?: LoginRole;
  };
  token_type?: string;
  context?: 'central' | 'tenant';
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    RouterLink,
    UiIconComponent,
    FormErrorComponent,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly siteState = inject(SiteStateService);
  private readonly authState = inject(AuthStateSevice);

  protected readonly site = this.siteState.siteState;
  protected readonly hasSiteState = this.siteState.hasState;

  protected readonly brandTitle = computed(
    () => this.siteState.title() || this.siteState.tradename() || 'Skolans Pro',
  );

  protected readonly brandMessage = computed(() => this.siteState.message());
  protected readonly brandMessageAuthor = computed(() => this.siteState.messageAuthor());
  protected readonly brandMessageSource = computed(() => this.siteState.messageSource());

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected submitted = false;
  protected submitting = false;
  protected errorMessage: string | null = null;
  protected showPassword = false;

  protected get userControl() {
    return this.form.controls.email;
  }

  protected get passwordControl() {
    return this.form.controls.password;
  }

  private buildRedirectUrl(data?: LoginData): string {
    const context = data?.context || 'central';
    const rolePath = data?.user?.role?.path || '/';
    const normalizedPath = rolePath.startsWith('/') ? rolePath : `/${rolePath}`;

    return `/${context}${normalizedPath}`;
  }

  private clearServerErrors(): void {
    const emailErrors = this.userControl.errors;
    const passwordErrors = this.passwordControl.errors;

    if (emailErrors?.['server']) {
      const { server, ...rest } = emailErrors;
      this.userControl.setErrors(Object.keys(rest).length ? rest : null);
    }

    if (passwordErrors?.['server']) {
      const { server, ...rest } = passwordErrors;
      this.passwordControl.setErrors(Object.keys(rest).length ? rest : null);
    }
  }

  private applyServerErrors(errors?: Record<string, unknown>): void {
    const emailError = errors?.['email'];
    const passwordError = errors?.['password'];

    if (Array.isArray(emailError) && emailError.length) {
      this.userControl.setErrors({
        ...(this.userControl.errors ?? {}),
        server: String(emailError[0]),
      });
    } else if (typeof emailError === 'string' && emailError) {
      this.userControl.setErrors({
        ...(this.userControl.errors ?? {}),
        server: emailError,
      });
    }

    if (Array.isArray(passwordError) && passwordError.length) {
      this.passwordControl.setErrors({
        ...(this.passwordControl.errors ?? {}),
        server: String(passwordError[0]),
      });
    } else if (typeof passwordError === 'string' && passwordError) {
      this.passwordControl.setErrors({
        ...(this.passwordControl.errors ?? {}),
        server: passwordError,
      });
    }
  }

  /**
   * Submits the login form.
   *
   * Error handling strategy:
   * - HTTP errors such as 401/422 are normalized by ApiService and shown through ToastService there.
   * - This component only maps field-level validation errors into the form controls when the API
   *   response is delivered through the regular envelope flow.
   * - The catch block does not show toast messages to avoid duplicate notifications.
   */
  protected async submit(): Promise<void> {
    this.submitted = true;
    this.errorMessage = null;
    this.clearServerErrors();

    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;

    try {
      const payload: LoginPayload = this.form.getRawValue();
      const response = await firstValueFrom(this.api.post<LoginData>('login', payload));
      if (!response.success) {
        const errorData = response.data as unknown as { errors?: Record<string, unknown> };

        // Apply field errors only when the backend returns validation-style details.
        if (errorData?.errors) {
          this.applyServerErrors(errorData.errors);
          this.form.markAllAsTouched();
        }

        return;
      }

      this.authState.setSession(response.data);

      const redirectUrl = this.buildRedirectUrl(response.data);
      console.log(redirectUrl);
      await this.router.navigateByUrl(redirectUrl);
    } catch (error) {
      console.error('[LoginError]', error);
      // Field errors are not applied here because HTTP errors are handled globally by ApiService.
      // This avoids duplicated toast notifications.
    } finally {
      this.submitting = false;
    }
  }
}
