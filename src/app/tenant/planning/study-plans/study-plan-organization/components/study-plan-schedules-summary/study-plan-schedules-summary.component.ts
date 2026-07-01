import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import type { StudyPlanSchedulesSummary } from '../../study-plan-organization.component';

type StudyPlanSchedulesSummaryStage = StudyPlanSchedulesSummary['items'][number];

@Component({
  selector: 'app-study-plan-schedules-summary',
  imports: [TranslatePipe, UiIconComponent],
  templateUrl: './study-plan-schedules-summary.component.html',
  styleUrl: './study-plan-schedules-summary.component.scss',
})
export class StudyPlanSchedulesSummaryComponent {
  readonly summary = input<StudyPlanSchedulesSummary | null>(null);
  /**
   * Backend-resolved child options passed by Organization.
   * This summary remains presentational and does not resolve permissions.
   */
  readonly options = input<ScreenOptionItem[]>([]);

  protected readonly stages = computed<StudyPlanSchedulesSummaryStage[]>(() => {
    return this.summary()?.items ?? [];
  });

  protected readonly hasSchedules = computed(() => {
    const summary = this.summary();

    return !!summary && summary.variants_count > 0 && this.stages().length > 0;
  });

  protected readonly hasMultipleVariants = computed(() => {
    return (this.summary()?.variants_count ?? 0) > 1;
  });

  protected subjectsTranslationKey(count: number): string {
    return count === 1
      ? 'planning.study-plan-organizations.schedules.subject-count'
      : 'planning.study-plan-organizations.schedules.subjects-count';
  }

  protected academicGroupsTranslationKey(count: number): string {
    return count === 1
      ? 'planning.study-plan-organizations.schedules.academic-group-count'
      : 'planning.study-plan-organizations.schedules.academic-groups-count';
  }

  protected scheduledGroupsTranslationKey(count: number): string {
    return count === 1
      ? 'planning.study-plan-organizations.schedules.scheduled-group-count'
      : 'planning.study-plan-organizations.schedules.scheduled-groups-count';
  }
}
