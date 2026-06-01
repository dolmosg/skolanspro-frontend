import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import { IOrganizationLogo } from '../organization-logos/organization-logos.component';

export interface OrganizationLogosModalData {
  logo?: IOrganizationLogo | null;
}

export interface OrganizationLogosModalPayload {
  name: string;
  file: string | null;
  default: boolean;
  active: boolean;
}

export interface OrganizationLogosModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload?: OrganizationLogosModalPayload;
}

@Component({
  selector: 'app-organization-logos-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiButtonComponent, TranslatePipe],
  templateUrl: './organization-logos-modal.component.html',
  styleUrl: './organization-logos-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationLogosModalComponent {
  private readonly modal = inject(SklModalService);
  private readonly fb = inject(FormBuilder);

  readonly data = input<OrganizationLogosModalData | null>(null);

  protected readonly logo = computed(() => this.data()?.logo ?? null);
  protected readonly isEditMode = computed(() => !!this.logo()?.id);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    default: [false, [Validators.required]],
    active: [true, [Validators.required]],
  });

  constructor() {
    effect(() => {
      const logo = this.logo();

      this.form.reset({
        name: logo?.name ?? '',
        default: logo?.default ?? false,
        active: logo?.active ?? true,
      });
    });
  }

  protected onCancel(): void {
    this.modal.close<OrganizationLogosModalResult>({
      saved: false,
      mode: this.getMode(),
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<OrganizationLogosModalResult>({
      saved: true,
      mode: this.getMode(),
      payload: this.buildPayload(),
    });
  }

  private getMode(): 'create' | 'edit' {
    return this.isEditMode() ? 'edit' : 'create';
  }

  private buildPayload(): OrganizationLogosModalPayload {
    const value = this.form.getRawValue();

    return {
      name: value.name.trim(),
      file: this.logo()?.file ?? null,
      default: value.default,
      active: value.active,
    };
  }
}