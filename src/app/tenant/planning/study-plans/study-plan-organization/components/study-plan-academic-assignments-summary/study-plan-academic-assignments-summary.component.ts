import { Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import type { StudyPlanAcademicAssignmentsSummary } from '../../study-plan-organization.component';

type StudyPlanAcademicAssignmentsSummaryStage =
  StudyPlanAcademicAssignmentsSummary['items'][number];
type StudyPlanAcademicAssignmentsSummaryGrade =
  StudyPlanAcademicAssignmentsSummaryStage['grades'][number];

export interface StudyPlanAcademicAssignmentsSelection {
  stageId: number;
  gradeId: number | null;
}

@Component({
  selector: 'app-study-plan-academic-assignments-summary',
  imports: [TranslatePipe, UiIconComponent],
  templateUrl: './study-plan-academic-assignments-summary.component.html',
  styleUrl: './study-plan-academic-assignments-summary.component.scss',
})
export class StudyPlanAcademicAssignmentsSummaryComponent {
  readonly summary = input<StudyPlanAcademicAssignmentsSummary | null>(null);
  readonly openGrade = output<StudyPlanAcademicAssignmentsSelection>();
  protected readonly stages = computed<StudyPlanAcademicAssignmentsSummaryStage[]>(() => {
    return this.summary()?.items ?? [];
  });

  protected readonly hasStages = computed(() => this.stages().length > 0);

  protected openAssignmentGrade(
    stage: StudyPlanAcademicAssignmentsSummaryStage,
    grade: StudyPlanAcademicAssignmentsSummaryGrade,
  ): void {
    this.openGrade.emit({
      stageId: stage.id,
      gradeId: grade.type === 'grade' ? grade.id : null,
    });
  }
}
