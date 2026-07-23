import { Component, OnInit, computed, input, signal } from '@angular/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenChildItem, ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type { ICommentType } from '@shared/interfaces/configuration.interfaces';
import type {
  IStudyPlan,
  IStudyPlanAspectsSummary,
  IStudyPlanGradingSetting,
} from '@shared/interfaces/study-plan-interfaces';

import {
  StudyPlanAspectsSummaryComponent,
  type StudyPlanAspectSelection,
} from './components/study-plan-aspects-summary/study-plan-aspects-summary.component';
import { StudyPlanAspectsViewComponent } from './components/study-plan-aspects-view/study-plan-aspects-view.component';
import { StudyPlanCommentsSummaryComponent } from './components/study-plan-comments-summary/study-plan-comments-summary.component';
import { StudyPlanGradeCaptureSummaryComponent } from './components/study-plan-grade-capture-summary/study-plan-grade-capture-summary.component';

interface StudyPlanEvaluationGradingSettings extends IStudyPlanGradingSetting {
  comment_type: ICommentType | null;
}

interface StudyPlanEvaluationStudyPlan extends Omit<IStudyPlan, 'grading_settings'> {
  grading_settings: StudyPlanEvaluationGradingSettings | null;
}

interface StudyPlanEvaluationSummaries {
  aspects: IStudyPlanAspectsSummary;
}

interface StudyPlanEvaluationPayload {
  study_plan: StudyPlanEvaluationStudyPlan;
  options: ScreenOptionItem[];
  children: ScreenChildItem[];
  summaries: StudyPlanEvaluationSummaries;
}

@Component({
  selector: 'app-study-plan-evaluation',
  imports: [
    StudyPlanAspectsSummaryComponent,
    StudyPlanAspectsViewComponent,
    StudyPlanGradeCaptureSummaryComponent,
    StudyPlanCommentsSummaryComponent,
  ],
  templateUrl: './study-plan-evaluation.component.html',
  styleUrl: './study-plan-evaluation.component.scss',
})
export class StudyPlanEvaluationComponent extends SkolansBaseComponent implements OnInit {
  readonly studyPlanId = input<number | null>(null);
  readonly route = input<string | null>(null);

  protected readonly evaluationPayload = signal<StudyPlanEvaluationPayload | null>(null);
  protected readonly selectedAspectsContext = signal<
    StudyPlanAspectSelection | null | undefined
  >(undefined);

  protected readonly showAspectsView = computed(() => this.selectedAspectsContext() !== undefined);
  protected readonly aspectsRoute = computed(() => this.getScreenChildRoute('study-plan-aspects'));
  protected readonly aspectsHasAllowedChildren = computed(
    () => this.getScreenChild('study-plan-aspects')?.has_allowed_children ?? false,
  );

  protected readonly showAspectsSummary = computed(() =>
    this.hasScreenChild('study-plan-aspects'),
  );
  protected readonly showGradeCaptureSummary = computed(() =>
    this.hasScreenChild('study-plan-grade-capture'),
  );
  protected readonly showCommentsSummary = computed(
    () =>
      this.hasScreenChild('study-plan-comments') &&
      this.evaluationPayload()?.study_plan.grading_settings?.comment_type?.name === 'catalog',
  );

  ngOnInit(): void {
    this.initRouteMeta();
    this.setEvaluationAssistantContext();
    this.loadEvaluationPayload();
  }

  private loadEvaluationPayload(): void {
    const route = this.route();

    if (!route || !this.studyPlanId()) {
      return;
    }

    this.executeSilentRequest<StudyPlanEvaluationPayload>(this.api.get(route), (response) => {
      this.evaluationPayload.set(response.data);
      this.setScreenOptions(response.data.options);
      this.setScreenChildren(response.data.children);
    });
  }

  protected openAspectsCatalog(): void {
    this.selectedAspectsContext.set(null);
  }

  protected openStageAspects(selection: StudyPlanAspectSelection): void {
    this.selectedAspectsContext.set(selection);
  }

  protected closeAspectsView(): void {
    this.selectedAspectsContext.set(undefined);
  }

  private setEvaluationAssistantContext(): void {
    this.setAssistantContext({
      contextType: 'section',
      contextId: 'planning.study-plans.evaluation',
      feature: 'study-plans',
      title: 'controllers.study-plan-evaluation',
      entity: 'StudyPlan',
      mode: 'evaluation',
      data: {
        studyPlanId: this.studyPlanId(),
      },
    });
  }
}
