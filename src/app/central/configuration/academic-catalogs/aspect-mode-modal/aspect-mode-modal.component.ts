import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import { IAspectMode } from '../aspect-modes/aspect-modes.component';

export interface AspectModeModalData {
  item?: IAspectMode | null;
}

export interface AspectModePayload {
  name: string;
  translation: string | null;
  active: boolean;
}

export interface AspectModeModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload?: AspectModePayload;
}

@Component({
  selector: 'app-aspect-mode-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, UiButtonComponent],
  templateUrl: './aspect-mode-modal.component.html',
  styleUrl: './aspect-mode-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AspectModeModalComponent {
  private readonly modal = inject(SklModalService);
  private readonly fb = inject(FormBuilder);

  readonly data = input<AspectModeModalData | null>(null);

  protected readonly item = computed(() => this.data()?.item ?? null);
  protected readonly isEditMode = computed(() => !!this.item()?.id);

  protected readonly translationPrefix = 'configuration.aspect-modes.translation.';

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    translation: ['', [Validators.maxLength(200)]],
    active: [true],
  });

  constructor() {
    effect(() => {
      const item = this.item();

      this.form.reset({
        name: item?.name ?? '',
        translation: item?.translation ?? '',
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
    this.modal.close<AspectModeModalResult>({
      saved: false,
      mode: this.getMode(),
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<AspectModeModalResult>({
      saved: true,
      mode: this.getMode(),
      payload: this.buildPayload(),
    });
  }

  private getMode(): 'create' | 'edit' {
    return this.isEditMode() ? 'edit' : 'create';
  }

  private buildPayload(): AspectModePayload {
    const value = this.form.getRawValue();

    return {
      name: value.name.trim(),
      translation: this.nullableTrim(value.translation),
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