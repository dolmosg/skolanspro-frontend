import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import type {
  IStudyPlanStage,
  IStudyPlanStageIntegration,
} from '../study-plan-academics/study-plan-academics.component';

export interface StudyPlanIntegrationStageSelection {
  stageId: number;
}

@Component({
  selector: 'app-study-plan-integrations-summary',
  standalone: true,
  imports: [CommonModule, TranslatePipe, UiIconComponent],
  templateUrl: './study-plan-integrations-summary.component.html',
  styleUrl: './study-plan-integrations-summary.component.scss',
})
export class StudyPlanIntegrationsSummaryComponent {
  readonly stages = input<IStudyPlanStage[]>([]);

  readonly openStageIntegrations = output<StudyPlanIntegrationStageSelection>();

  protected readonly totalIntegrations = computed(() => {
    return this.stages().reduce((total, stage) => {
      return total + (stage.integrations?.length ?? 0);
    }, 0);
  });

  protected readonly activeIntegrations = computed(() => {
    return this.stages().reduce((total, stage) => {
      return total + (stage.integrations ?? []).filter((integration) => integration.active).length;
    }, 0);
  });

  protected readonly hasStages = computed(() => {
    return this.stages().length > 0;
  });

  protected readonly hasConfiguredTerms = computed(() => {
    return this.stages().some((stage) => (stage.terms?.length ?? 0) > 0);
  });

  protected readonly hasConfiguredSubjects = computed(() => {
    return this.stages().some((stage) => {
      return (stage.subjects_summary?.total_subjects ?? 0) > 0;
    });
  });

  protected readonly canManageIntegrations = computed(() => {
    return this.hasStages() && this.hasConfiguredTerms() && this.hasConfiguredSubjects();
  });

  protected stageIntegrations(stage: IStudyPlanStage): IStudyPlanStageIntegration[] {
    return stage.integrations ?? [];
  }

  protected onOpenStage(stageId: number): void {
    this.openStageIntegrations.emit({ stageId });
  }
}
