import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import { ILevel, IOrganizationLogo } from '../levels/levels.component';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';

export interface LevelsModalData {
  level?: ILevel | null;
  organization_logos: IOrganizationLogo[];
}

export interface LevelsModalPayload {
  name: string;
  description: string;
  registration: string | null;
  revoe: string | null;
  billing: string | null;
  css_class: string | null;
  order: number;
  translation: string | null;
  organization_logo_id: number | null;
}

export interface LevelsModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload?: LevelsModalPayload;
}

@Component({
  selector: 'app-levels-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiButtonComponent, TranslatePipe, SkSelectComponent],
  templateUrl: './levels-modal.component.html',
  styleUrl: './levels-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LevelsModalComponent {
  private readonly modal = inject(SklModalService);
  private readonly fb = inject(FormBuilder);

  readonly data = input<LevelsModalData | null>(null);

  protected readonly level = computed(() => this.data()?.level ?? null);
  protected readonly organizationLogos = computed(() => this.data()?.organization_logos ?? []);
  protected readonly isEditMode = computed(() => !!this.level()?.id);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    description: ['', [Validators.required, Validators.maxLength(100)]],
    registration: ['', [Validators.maxLength(45)]],
    revoe: ['', [Validators.maxLength(45)]],
    billing: ['', [Validators.maxLength(45)]],
    css_class: ['', [Validators.maxLength(45)]],
    order: [0, [Validators.required, Validators.min(0), Validators.max(255)]],
    translation: ['', [Validators.maxLength(128)]],
    organization_logo_id: [null as number | null],
  });

  constructor() {
    effect(() => {
      const level = this.level();

      this.form.reset({
        name: level?.name ?? '',
        description: level?.description ?? '',
        registration: level?.registration ?? '',
        revoe: level?.revoe ?? '',
        billing: level?.billing ?? '',
        css_class: level?.css_class ?? '',
        order: level?.order ?? 0,
        translation: level?.translation ?? '',
        organization_logo_id: level?.organization_logo_id ?? null,
      });
    });
  }

  protected onCancel(): void {
    this.modal.close<LevelsModalResult>({
      saved: false,
      mode: this.getMode(),
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<LevelsModalResult>({
      saved: true,
      mode: this.getMode(),
      payload: this.buildPayload(),
    });
  }

  private getMode(): 'create' | 'edit' {
    return this.isEditMode() ? 'edit' : 'create';
  }

  private buildPayload(): LevelsModalPayload {
    const value = this.form.getRawValue();

    return {
      name: value.name.trim(),
      description: value.description.trim(),
      registration: this.nullableTrim(value.registration),
      revoe: this.nullableTrim(value.revoe),
      billing: this.nullableTrim(value.billing),
      css_class: this.nullableTrim(value.css_class),
      order: Number(value.order ?? 0),
      translation: this.nullableTrim(value.translation),
      organization_logo_id: value.organization_logo_id,
    };
  }

  private nullableTrim(value: string | null | undefined): string | null {
    const trimmed = value?.trim() ?? '';

    return trimmed.length > 0 ? trimmed : null;
  }
}