import { Component, computed, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { LearningArea } from '../learning-areas/learning-areas.component';

export interface ILearningAreaModalData {
  item: LearningArea | null;
  order: number;
}

export interface ILearningAreaModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string;
    color: string | null;
    active: boolean;
    order: number;
  };
}

@Component({
  selector: 'app-learning-area-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, UiButtonComponent],
  templateUrl: './learning-area-modal.component.html',
  styleUrl: './learning-area-modal.component.scss',
})
export class LearningAreaModalComponent {
  readonly data = input.required<ILearningAreaModalData>();

  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);

  protected readonly isEdit = computed(() => !!this.data().item);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(70)]],
    translation: ['', [Validators.required, Validators.maxLength(200)]],
    color: [''],
    active: [true, [Validators.required]],
    order: [0, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    queueMicrotask(() => this.patchForm());
  }

  private patchForm(): void {
    const item = this.data().item;

    if (!item) {
      this.form.patchValue({
        color: '',
        order: this.data().order,
      });

      return;
    }

    this.form.patchValue({
      name: item.name,
      translation: item.translation,
      color: item.color ?? '',
      active: item.active,
      order: item.order ?? this.data().order,
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<ILearningAreaModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.buildPayload(),
    });
  }

  protected onCancel(): void {
    this.modal.close(null);
  }

  private buildPayload(): ILearningAreaModalResult['payload'] {
    const value = this.form.getRawValue();

    return {
      name: value.name.trim(),
      translation: value.translation.trim(),
      color: value.color.trim() || null,
      active: value.active,
      order: Number(value.order ?? 0),
    };
  }

  protected clearColor(): void {
    this.form.controls.color.setValue('');
  }
}
