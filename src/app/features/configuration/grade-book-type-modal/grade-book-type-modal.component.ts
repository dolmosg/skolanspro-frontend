import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { IGradebookType } from '../gradebook-types/gradebook-types.component';

export interface GradeBookTypeModalData {
  item?: IGradebookType | null;
}

export interface GradeBookTypePayload {
  name: string;
  translation: string | null;
  active: boolean;
}

export interface GradeBookTypeModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload?: GradeBookTypePayload;
}

@Component({
  selector: 'app-grade-book-type-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, UiButtonComponent],
  templateUrl: './grade-book-type-modal.component.html',
  styleUrl: './grade-book-type-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradeBookTypeModalComponent {
  private readonly modal = inject(SklModalService);
  private readonly fb = inject(FormBuilder);

  readonly data = input<GradeBookTypeModalData | null>(null);

  protected readonly item = computed(() => this.data()?.item ?? null);
  protected readonly isEditMode = computed(() => !!this.item()?.id);

  protected helper = 'configuration.gradebook-types.translation';

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    translation: ['', [Validators.maxLength(150)]],
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

  protected onCancel(): void {
    this.modal.close<GradeBookTypeModalResult>({
      saved: false,
      mode: this.getMode(),
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<GradeBookTypeModalResult>({
      saved: true,
      mode: this.getMode(),
      payload: this.buildPayload(),
    });
  }

  private getMode(): 'create' | 'edit' {
    return this.isEditMode() ? 'edit' : 'create';
  }

  private buildPayload(): GradeBookTypePayload {
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

  protected onNameChange(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value?.trim() ?? '';


    if (!value) {
      this.form.controls.translation.setValue('');
      return;
    }

    this.form.controls.translation.setValue(`${this.helper}.${value}`);
  }
}
