import { Component, computed, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { SubjectSubcategory } from '../subject-sub-categories/subject-sub-categories.component';

export interface ISubjectSubCategoryModalData {
  subjectClassificationId: number;
  item: SubjectSubcategory | null;
  order: number;
}

export interface ISubjectSubCategoryModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    subject_classification_id: number;
    name: string;
    translation: string;
    active: boolean;
    order: number;
  };
}

@Component({
  selector: 'app-subject-sub-category-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, UiButtonComponent],
  templateUrl: './subject-sub-category-modal.component.html',
  styleUrl: './subject-sub-category-modal.component.scss',
})
export class SubjectSubCategoryModalComponent {
  readonly data = input.required<ISubjectSubCategoryModalData>();

  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);

  protected readonly isEdit = computed(() => !!this.data().item);

  protected readonly form = this.fb.nonNullable.group({
    subject_classification_id: [0, [Validators.required, Validators.min(1)]],
    name: ['', [Validators.required, Validators.maxLength(70)]],
    translation: ['', [Validators.required, Validators.maxLength(200)]],
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
        subject_classification_id: this.data().subjectClassificationId,
        order: this.data().order,
      });

      return;
    }

    this.form.patchValue({
      subject_classification_id: item.subject_classification_id,
      name: item.name,
      translation: item.translation,
      active: item.active,
      order: item.order ?? this.data().order,
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<ISubjectSubCategoryModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.buildPayload(),
    });
  }

  protected onCancel(): void {
    this.modal.close(null);
  }

  private buildPayload(): ISubjectSubCategoryModalResult['payload'] {
    const value = this.form.getRawValue();

    return {
      subject_classification_id: Number(value.subject_classification_id),
      name: value.name.trim(),
      translation: value.translation.trim(),
      active: value.active,
      order: Number(value.order ?? 0),
    };
  }
}