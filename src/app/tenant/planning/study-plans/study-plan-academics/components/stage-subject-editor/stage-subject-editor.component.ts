import { CommonModule } from '@angular/common';
import { Component, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';

import {
  IStudyPlanStageSubject,
  IStudyPlanStageSubjectsCatalogs,
} from '../study-plan-subjects.interfaces';

export interface StageSubjectEditorResult {
  id: number;
  subject_type_id: number;
  evaluation_type_id: number;
  grade_policy_id: number | null;
  extra: boolean;
  descriptive_show: boolean;
  descriptive_full: boolean;
}

@Component({
  selector: 'app-stage-subject-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, UiButtonComponent, SkSelectComponent],
  templateUrl: './stage-subject-editor.component.html',
  styleUrl: './stage-subject-editor.component.scss',
})
export class StageSubjectEditorComponent {
  readonly subject = input.required<IStudyPlanStageSubject>();
  readonly catalogs = input.required<IStudyPlanStageSubjectsCatalogs>();

  readonly save = output<StageSubjectEditorResult>();
  readonly cancel = output<void>();

  protected readonly form = new FormGroup({
    subject_type_id: new FormControl<number | null>(null, Validators.required),
    evaluation_type_id: new FormControl<number | null>(null, Validators.required),
    grade_policy_id: new FormControl<number | null>(null),
    extra: new FormControl(false, { nonNullable: true }),
    descriptive_show: new FormControl(false, { nonNullable: true }),
    descriptive_full: new FormControl(false, { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const subject = this.subject();

      this.form.reset({
        subject_type_id: subject.subject_type_id,
        evaluation_type_id: subject.evaluation_type_id,
        grade_policy_id: subject.grade_policy_id,
        extra: subject.extra,
        descriptive_show: subject.descriptive_show,
        descriptive_full: subject.descriptive_full,
      });
    });
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.save.emit({
      id: this.subject().id,
      subject_type_id: value.subject_type_id!,
      evaluation_type_id: value.evaluation_type_id!,
      grade_policy_id: value.grade_policy_id,
      extra: value.extra,
      descriptive_show: value.descriptive_show,
      descriptive_full: value.descriptive_full,
    });
  }
}