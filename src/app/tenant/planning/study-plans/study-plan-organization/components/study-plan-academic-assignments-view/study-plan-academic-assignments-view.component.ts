import { Component, computed, effect, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import {
  type ISklConfirmModalData,
  SklConfirmModal,
} from '@shared/base/skl-confirm-modal/skl-confirm-modal';
import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import type {
  StudyPlanAcademicAssignmentsSummary,
  StudyPlanOrganizationSummariesPatch,
} from '../../study-plan-organization.component';
import {
  EMPTY_STUDY_PLAN_ACADEMIC_ASSIGNMENTS_CATALOGS,
  StudyPlanAcademicAssignmentsGradeDetailComponent,
  type StudyPlanAcademicAssignmentsCatalogs,
  type StudyPlanAcademicAssignmentsMutationResult,
  type StudyPlanAcademicAssignmentsOrganizationMutation,
} from '../study-plan-academic-assignments-grade-detail/study-plan-academic-assignments-grade-detail.component';

type StudyPlanAcademicAssignmentsSummaryStage =
  StudyPlanAcademicAssignmentsSummary['items'][number];
type StudyPlanAcademicAssignmentsSummaryGrade =
  StudyPlanAcademicAssignmentsSummaryStage['grades'][number];

interface StudyPlanAcademicAssignmentsAssignGradeResponse {
  created_count: number;
  grade_summary: StudyPlanAcademicAssignmentsMutationResult['grade_summary'];
  organization_summaries: StudyPlanOrganizationSummariesPatch;
}

@Component({
  selector: 'app-study-plan-academic-assignments-view',
  imports: [
    TranslatePipe,
    UiButtonComponent,
    UiIconComponent,
    StudyPlanAcademicAssignmentsGradeDetailComponent,
  ],
  templateUrl: './study-plan-academic-assignments-view.component.html',
  styleUrl: './study-plan-academic-assignments-view.component.scss',
})
export class StudyPlanAcademicAssignmentsViewComponent extends SkolansBaseComponent {
  readonly route = input<string | null>(null);
  readonly studyPlan = input<unknown | null>(null);
  readonly stage = input.required<StudyPlanAcademicAssignmentsSummaryStage | null>();
  readonly gradeId = input.required<number | null>();
  readonly catalogs = input<StudyPlanAcademicAssignmentsCatalogs>(
    EMPTY_STUDY_PLAN_ACADEMIC_ASSIGNMENTS_CATALOGS,
  );
  readonly screenOptions = input<ScreenOptionItem[]>([]);
  readonly back = output<void>();
  readonly assignmentMutation = output<StudyPlanAcademicAssignmentsOrganizationMutation>();

  private readonly selectedGradeId = signal<number | null>(null);
  protected readonly detailReloadToken = signal(0);

  protected readonly grades = computed(() => this.stage()?.grades ?? []);

  protected readonly selectedGrade = computed(() => {
    const gradeId = this.selectedGradeId();

    return (
      this.grades().find((grade) => {
        if (grade.type === 'crossover') {
          return gradeId === null;
        }

        return grade.id === gradeId;
      }) ?? null
    );
  });
  protected readonly assignGradeOption = computed(() => {
    const grade = this.selectedGrade();

    if (!grade || grade.type !== 'grade') {
      return null;
    }

    return this.getScreenOption('assign-grade');
  });

  constructor() {
    super();

    effect(() => {
      this.setScreenOptions(this.screenOptions());
    });

    effect(() => {
      this.selectedGradeId.set(this.gradeId());
    });
  }

  protected subjectsTranslationKey(count: number): string {
    return count === 1
      ? 'planning.study-plan-organizations.academic-assignments.subject-count'
      : 'planning.study-plan-organizations.academic-assignments.subjects-count';
  }

  protected groupsTranslationKey(count: number): string {
    return count === 1
      ? 'planning.study-plan-organizations.stage-groups.group-count'
      : 'planning.study-plan-organizations.stage-groups.groups-count';
  }

  protected isSelected(grade: StudyPlanAcademicAssignmentsSummaryGrade): boolean {
    if (grade.type === 'crossover') {
      return this.selectedGradeId() === null;
    }

    return grade.id === this.selectedGradeId();
  }

  protected selectGrade(grade: StudyPlanAcademicAssignmentsSummaryGrade): void {
    this.selectedGradeId.set(grade.type === 'grade' ? grade.id : null);
  }

  protected assignGrade(): void {
    void this.confirmAssignGrade();
  }

  protected relayAssignmentMutation(change: StudyPlanAcademicAssignmentsMutationResult): void {
    this.assignmentMutation.emit(change);
  }

  protected onBack(): void {
    this.back.emit();
  }

  private async confirmAssignGrade(): Promise<void> {
    const route = this.route()?.trim() ?? '';
    const stage = this.stage();
    const grade = this.selectedGrade();
    const assignOption = this.assignGradeOption();

    if (!route || !stage || !grade || grade.type !== 'grade' || !assignOption) {
      return;
    }

    const confirmed = await this.modal.open<ISklConfirmModalData, boolean>({
      component: SklConfirmModal,
      title: this.translate.instant(
        'planning.study-plan-organizations.academic-assignments.assign-grade.confirm-title',
      ),
      data: {
        message: this.translate.instant(
          'planning.study-plan-organizations.academic-assignments.assign-grade.confirm-message',
        ),
        confirmLabel: this.translate.instant(
          'planning.study-plan-organizations.academic-assignments.assign-grade.confirm-accept',
        ),
        cancelLabel: this.translate.instant(
          'planning.study-plan-organizations.academic-assignments.assign-grade.confirm-cancel',
        ),
        type: 'info',
      },
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) {
      return;
    }

    this.executeMutationRequest<StudyPlanAcademicAssignmentsAssignGradeResponse>(
      this.api.post(`${route}/${stage.id}/assign-grade`, { grade_id: grade.id }),
      (res) => {
        this.detailReloadToken.update((token) => token + 1);
        this.assignmentMutation.emit({
          grade_summary: res.data.grade_summary,
          organization_summaries: res.data.organization_summaries,
        });
      },
    );
  }
}
