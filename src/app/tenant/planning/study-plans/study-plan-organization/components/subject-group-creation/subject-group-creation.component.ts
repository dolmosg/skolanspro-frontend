import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { FormErrorComponent } from '@shared/ui/form-error/form-error';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import type {
  StudyPlanAcademicAssignmentsCatalogs,
  StudyPlanAcademicAssignmentsGradeSubject,
  StudyPlanAcademicAssignmentsGradeSubjectGroup,
  StudyPlanAcademicAssignmentsMutationResult,
} from '../study-plan-academic-assignments-grade-detail/study-plan-academic-assignments-grade-detail.component';
import type { StudyPlanOrganizationSummariesPatch } from '../../study-plan-organization.component';

interface SubjectGroupCreationPayload {
  stage_subject_id: number;
  grade_id: number | null;
  code: string;
  name: string;
  gender_id: number | null;
  quota: number;
  color: string | null;
}

export interface SubjectGroupCreationResponse extends StudyPlanAcademicAssignmentsMutationResult {
  group: StudyPlanAcademicAssignmentsGradeSubjectGroup;
  organization_summaries: StudyPlanOrganizationSummariesPatch;
}

@Component({
  selector: 'app-subject-group-creation',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    FormErrorComponent,
    SkSelectComponent,
    UiButtonComponent,
    UiIconComponent,
  ],
  templateUrl: './subject-group-creation.component.html',
  styleUrl: './subject-group-creation.component.scss',
})
export class SubjectGroupCreationComponent extends SkolansBaseComponent {
  private readonly fb = inject(FormBuilder);

  readonly route = input.required<string>();
  readonly stageId = input.required<number>();
  readonly gradeId = input<number | null>(null);
  readonly subject = input.required<StudyPlanAcademicAssignmentsGradeSubject>();
  readonly catalogs = input.required<StudyPlanAcademicAssignmentsCatalogs>();
  readonly created = output<SubjectGroupCreationResponse>();
  readonly close = output<void>();

  protected readonly form = this.fb.group({
    code: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(10)]),
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(128)]),
    gender_id: this.fb.control<number | null>(null),
    quota: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    color: this.fb.control<string | null>(null, [Validators.maxLength(10)]),
  });

  private readonly initializedSubjectId = signal<number | null>(null);
  protected readonly colorSelected = signal(false);
  protected readonly colorPickerFallback = '#000000';

  constructor() {
    super();

    effect(() => {
      const subject = this.subject();

      if (this.initializedSubjectId() === subject.id) {
        return;
      }

      this.initializedSubjectId.set(subject.id);
      this.resetForm(subject);
    });
  }

  protected saveGroup(): void {
    const route = this.createGroupRoute();

    if (!route || this.loading()) {
      return;
    }

    this.form.markAllAsTouched();
    this.form.updateValueAndValidity();

    if (this.form.invalid) {
      return;
    }

    this.executeMutationRequest<SubjectGroupCreationResponse>(
      this.api.post(route, this.creationPayload()),
      (res) => {
        this.created.emit(res.data);
      },
    );
  }

  protected closeEditor(): void {
    if (this.loading()) {
      return;
    }

    this.close.emit();
  }

  protected colorPickerValue(): string {
    return this.form.controls.color.value ?? this.colorPickerFallback;
  }

  protected setColor(event: Event): void {
    const target = event.target as HTMLInputElement | null;

    this.colorSelected.set(true);
    this.form.controls.color.setValue(target?.value || this.colorPickerFallback);
    this.form.controls.color.markAsDirty();
  }

  private resetForm(subject: StudyPlanAcademicAssignmentsGradeSubject): void {
    this.form.reset({
      code: subject.code?.trim() ?? '',
      name: subject.name?.trim() ?? '',
      gender_id: null,
      quota: 0,
      color: null,
    });
    this.colorSelected.set(false);
  }

  private createGroupRoute(): string | null {
    const baseRoute = this.route().trim();
    const stageId = this.stageId();

    if (!baseRoute || !stageId) {
      return null;
    }

    return `${baseRoute}/${stageId}/groups`;
  }

  private creationPayload(): SubjectGroupCreationPayload {
    const value = this.form.getRawValue();
    const color = this.colorSelected() ? value.color?.trim() || null : null;

    return {
      stage_subject_id: this.subject().id,
      grade_id: this.gradeId(),
      code: value.code.trim(),
      name: value.name.trim(),
      gender_id: value.gender_id,
      quota: Number(value.quota),
      color,
    };
  }
}
