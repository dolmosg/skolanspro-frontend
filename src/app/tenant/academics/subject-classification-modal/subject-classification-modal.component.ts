import { Component, computed, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { SubjectClassification } from '../subject-classifications/subject-classifications.component';

export interface ISubjectClassificationModalData {
  item: SubjectClassification | null;
  order: number;
}

export interface ISubjectClassificationModalResult {
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
  selector: 'app-subject-classification-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, UiButtonComponent],
  templateUrl: './subject-classification-modal.component.html',
  styleUrl: './subject-classification-modal.component.scss',
})
export class SubjectClassificationModalComponent {
  readonly data = input.required<ISubjectClassificationModalData>();

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

    this.modal.close<ISubjectClassificationModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.buildPayload(),
    });
  }

  protected onCancel(): void {
    this.modal.close(null);
  }

  private buildPayload(): ISubjectClassificationModalResult['payload'] {
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