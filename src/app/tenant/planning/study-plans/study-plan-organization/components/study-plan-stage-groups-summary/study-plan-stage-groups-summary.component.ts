import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import type { StudyPlanStageGroupsSummary } from '../../study-plan-organization.component';

type StudyPlanStageGroupsSummaryStage = StudyPlanStageGroupsSummary['items'][number];

@Component({
  selector: 'app-study-plan-stage-groups-summary',
  imports: [TranslatePipe, UiIconComponent],
  templateUrl: './study-plan-stage-groups-summary.component.html',
  styleUrl: './study-plan-stage-groups-summary.component.scss',
})
export class StudyPlanStageGroupsSummaryComponent {
  readonly summary = input<StudyPlanStageGroupsSummary | null>(null);
  /**
   * Backend-resolved child options passed by Organization.
   * This summary remains presentational and does not resolve permissions.
   */
  readonly options = input<ScreenOptionItem[]>([]);

  protected readonly stages = computed<StudyPlanStageGroupsSummaryStage[]>(() => {
    return this.summary()?.items ?? [];
  });

  protected readonly hasStages = computed(() => this.stages().length > 0);

  protected groupsTranslationKey(count: number): string {
    return count === 1
      ? 'planning.study-plan-organizations.stage-groups.group-count'
      : 'planning.study-plan-organizations.stage-groups.groups-count';
  }
}
