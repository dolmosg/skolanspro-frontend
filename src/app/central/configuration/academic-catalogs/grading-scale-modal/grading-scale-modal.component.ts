import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import { IGradingScale } from '../grading-scales/grading-scales.component';

export interface GradingScaleModalData {
  item?: IGradingScale | null;
}

export interface GradingScalePayload {
  name: string;
  translation: string | null;
  minimum: number;
  maximum: number;
  active: boolean;
}

export interface GradingScaleModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload?: GradingScalePayload;
}

@Component({
  selector: 'app-grading-scale-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, UiButtonComponent],
  templateUrl: './grading-scale-modal.component.html',
  styleUrl: './grading-scale-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradingScaleModalComponent {
  private readonly modal = inject(SklModalService);
  private readonly fb = inject(FormBuilder);

  readonly data = input<GradingScaleModalData | null>(null);

  protected readonly item = computed(() => this.data()?.item ?? null);
  protected readonly isEditMode = computed(() => !!this.item()?.id);

  protected readonly translationPrefix = 'configuration.grading-scales.translation.';

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    translation: ['', [Validators.maxLength(200)]],
    minimum: [0, [Validators.required, Validators.min(0), Validators.max(255)]],
    maximum: [10, [Validators.required, Validators.min(0), Validators.max(255)]],
    active: [true],
  });

  constructor() {
    effect(() => {
      const item = this.item();

      this.form.reset({
        name: item?.name ?? '',
        translation: item?.translation ?? '',
        minimum: item?.minimum ?? 0,
        maximum: item?.maximum ?? 10,
        active: item?.active ?? true,
      });
    });
  }

  protected onNameChange(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value?.trim() ?? '';
    const translationControl = this.form.controls.translation;

    if (!value) {
      translationControl.setValue('');
      return;
    }

    const current = translationControl.value ?? '';

    if (!current || current.startsWith(this.translationPrefix)) {
      translationControl.setValue(`${this.translationPrefix}${this.slug(value)}`);
    }
  }

  protected onCancel(): void {
    this.modal.close<GradingScaleModalResult>({
      saved: false,
      mode: this.getMode(),
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<GradingScaleModalResult>({
      saved: true,
      mode: this.getMode(),
      payload: this.buildPayload(),
    });
  }

  private getMode(): 'create' | 'edit' {
    return this.isEditMode() ? 'edit' : 'create';
  }

  private buildPayload(): GradingScalePayload {
    const value = this.form.getRawValue();

    return {
      name: value.name.trim(),
      translation: this.nullableTrim(value.translation),
      minimum: Number(value.minimum),
      maximum: Number(value.maximum),
      active: value.active,
    };
  }

  private nullableTrim(value: string | null | undefined): string | null {
    const trimmed = value?.trim() ?? '';

    return trimmed.length > 0 ? trimmed : null;
  }

  private slug(value: string): string {
    return value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
}