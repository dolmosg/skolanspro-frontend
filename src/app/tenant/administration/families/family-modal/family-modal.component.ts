import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { SkTextCaseDirective } from '@shared/directives/sk-text-mode-case';
import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { FormErrorComponent } from '@shared/ui/form-error/form-error';

export interface FamilyModalData {
  family?: FamilyModalValue | null;
  familyStatuses?: any[];
}

export interface FamilyModalValue {
  id?: number;
  code?: string | null;
  lastname: string;
  mothername?: string | null;
  email?: string | null;
  registered_at?: string | null;
  family_status_id: number | null;
}

@Component({
  selector: 'app-family-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    UiButtonComponent,
    SkSelectComponent,
    SkTextCaseDirective,
    FormErrorComponent,
  ],
  templateUrl: './family-modal.component.html',
  styleUrl: './family-modal.component.scss',
})
export class FamilyModalComponent extends SkolansBaseComponent {
  readonly data = input<FamilyModalData | null>(null);

  private readonly fb = inject(FormBuilder);

  readonly submitted = signal(false);

  readonly familyStatuses = computed(() => this.data()?.familyStatuses ?? []);
  readonly family = computed(() => this.data()?.family ?? null);
  readonly isEdit = computed(() => !!this.family()?.id);
  readonly textCaseMode = this.nameCasing;

  readonly form = this.fb.group({
    lastname: ['', [Validators.required, Validators.maxLength(70)]],
    mothername: ['', [Validators.maxLength(70)]],
    email: ['', [Validators.email, Validators.maxLength(100)]],
    family_status_id: [null as number | null, [Validators.required]],
  });

  ngOnInit(): void {
    const family = this.family();

    if (!family) {
      return;
    }

    this.form.patchValue({
      lastname: family.lastname ?? '',
      mothername: family.mothername ?? '',
      email: family.email ?? '',
      family_status_id: family.family_status_id ?? null,
    });
  }

  save(): void {
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.modal.close({
      lastname: value.lastname!.trim(),
      mothername: value.mothername?.trim() || null,
      email: value.email?.trim() || null,
      family_status_id: value.family_status_id,
    });
  }

  cancel(): void {
    this.modal.close(null);
  }

  hasError(controlName: keyof typeof this.form.controls, error: string): boolean {
    const control = this.form.controls[controlName];

    return control.hasError(error) && (control.touched || this.submitted());
  }
}
