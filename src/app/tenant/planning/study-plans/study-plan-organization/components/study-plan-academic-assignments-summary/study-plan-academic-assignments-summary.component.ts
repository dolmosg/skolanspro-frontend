import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import type { StudyPlanAcademicAssignmentsSummary } from '../../study-plan-organization.component';

type StudyPlanAcademicAssignmentsSummaryStage =
  StudyPlanAcademicAssignmentsSummary['items'][number];

@Component({
  selector: 'app-study-plan-academic-assignments-summary',
  imports: [TranslatePipe, UiIconComponent],
  templateUrl: './study-plan-academic-assignments-summary.component.html',
  styleUrl: './study-plan-academic-assignments-summary.component.scss',
})
export class StudyPlanAcademicAssignmentsSummaryComponent {
  readonly summary = input<StudyPlanAcademicAssignmentsSummary | null>(null);
  /**
   * Backend-resolved child options passed by Organization.
   * This summary remains presentational and does not resolve permissions.
   */
  readonly options = input<ScreenOptionItem[]>([]);

  protected readonly stages = computed<StudyPlanAcademicAssignmentsSummaryStage[]>(() => {
    return this.summary()?.items ?? [];
  });

  protected readonly hasStages = computed(() => this.stages().length > 0);
}
