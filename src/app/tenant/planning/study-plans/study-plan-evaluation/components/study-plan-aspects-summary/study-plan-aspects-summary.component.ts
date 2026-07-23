import { Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import type {
  IStudyPlan,
  IStudyPlanAspectsSummary,
} from '@shared/interfaces/study-plan-interfaces';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

export interface StudyPlanAspectSelection {
  stageId: number;
  gradeId: number | null;
}

@Component({
  selector: 'app-study-plan-aspects-summary',
  imports: [TranslatePipe, UiIconComponent],
  templateUrl: './study-plan-aspects-summary.component.html',
  styleUrl: './study-plan-aspects-summary.component.scss',
})
export class StudyPlanAspectsSummaryComponent {
  readonly summary = input.required<IStudyPlanAspectsSummary>();
  readonly studyPlan = input.required<IStudyPlan>();
  readonly hasAllowedChildren = input(false);
  readonly openCatalog = output<void>();
  readonly openConfiguration = output<StudyPlanAspectSelection>();

  protected readonly grades = computed(() => this.studyPlan().level?.grades ?? []);
  protected readonly crossoverStageIds = computed(
    () =>
      new Set(
        this.studyPlan().stages?.filter((stage) => stage.has_crossovers).map((stage) => stage.id),
      ),
  );

  protected openAspectsCatalog(): void {
    this.openCatalog.emit();
  }

  protected openStageConfiguration(stageId: number, gradeId: number | null): void {
    this.openConfiguration.emit({ stageId, gradeId });
  }

  protected configuredSubjectsTranslationKey(total: number): string {
    return total === 1
      ? 'planning.study-plan-evaluations.aspects.configured-subject-singular'
      : 'planning.study-plan-evaluations.aspects.configured-subjects';
  }

  protected unusedAspectsTranslationKey(count: number): string {
    return count === 1
      ? 'planning.study-plan-evaluations.aspects.unused-aspect-singular'
      : 'planning.study-plan-evaluations.aspects.unused-aspects';
  }
}
