import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { IGradebookAction } from '../gradebook-actions/gradebook-actions.component';

export interface GradebookActionModalData {
  item?: IGradebookAction | null;
}

export interface GradebookActionPayload {
  name: string;
  translation: string | null;
  icon: string | null;
  color: string | null;
  active: boolean;
  order: number;
}

export interface GradebookActionModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload?: GradebookActionPayload;
}

@Component({
  selector: 'app-gradebook-action-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, UiButtonComponent],
  templateUrl: './gradebook-action-modal.component.html',
  styleUrl: './gradebook-action-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradebookActionModalComponent {
  private readonly modal = inject(SklModalService);
  private readonly fb = inject(FormBuilder);

  readonly data = input<GradebookActionModalData | null>(null);

  protected readonly item = computed(() => this.data()?.item ?? null);
  protected readonly isEditMode = computed(() => !!this.item()?.id);

  protected readonly translationPrefix = 'configuration.gradebook-actions.translation.';

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    translation: ['', [Validators.maxLength(150)]],
    icon: ['', [Validators.maxLength(45)]],
    color: ['', [Validators.maxLength(30)]],
    active: [true],
    order: [0, [Validators.required, Validators.min(0), Validators.max(255)]],
  });

  constructor() {
    effect(() => {
      const item = this.item();

      this.form.reset({
        name: item?.name ?? '',
        translation: item?.translation ?? '',
        icon: item?.icon ?? '',
        color: item?.color ?? '',
        active: item?.active ?? true,
        order: item?.order ?? 0,
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
      translationControl.setValue(`${this.translationPrefix}${value}`);
    }
  }

  protected onCancel(): void {
    this.modal.close<GradebookActionModalResult>({
      saved: false,
      mode: this.getMode(),
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<GradebookActionModalResult>({
      saved: true,
      mode: this.getMode(),
      payload: this.buildPayload(),
    });
  }

  private getMode(): 'create' | 'edit' {
    return this.isEditMode() ? 'edit' : 'create';
  }

  private buildPayload(): GradebookActionPayload {
    const value = this.form.getRawValue();

    return {
      name: value.name.trim(),
      translation: this.nullableTrim(value.translation),
      icon: this.nullableTrim(value.icon),
      color: this.nullableTrim(value.color),
      active: value.active,
      order: Number(value.order),
    };
  }

  private nullableTrim(value: string | null | undefined): string | null {
    const trimmed = value?.trim() ?? '';

    return trimmed.length > 0 ? trimmed : null;
  }
}