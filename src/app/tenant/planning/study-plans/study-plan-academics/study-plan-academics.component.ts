import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  input,
  OnChanges,
  OnInit,
  signal,
  SimpleChanges,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { ScreenChildItem, ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { StudyPlanStagesSummaryComponent } from './components/study-plan-stages-summary/study-plan-stages-summary.component';
import { StudyPlanStageComponent } from './components/study-plan-stage/study-plan-stage.component';
import {
  StudyPlanStageGradeSelection,
  StudyPlanSubjectsSummaryComponent,
} from './components/study-plan-subjects-summary/study-plan-subjects-summary.component';
import { StudyPlanStageSubjectsComponent } from './components/study-plan-stage-subjects/study-plan-stage-subjects.component';
import { StudyPlanIntegrationsSummaryComponent } from './components/study-plan-integrations-summary/study-plan-integrations-summary.component';
import { StageIntegrationsComponent } from './components/stage-integrations/stage-integrations.component';
import { StudyPlanConfigurationItem } from '../study-plan-configuration/study-plan-configuration.component';

export interface IStudyPlanTermStatus {
  id: number;
  name: string;
  translation: string;
  css_class: string | null;
}

export interface IStudyPlanTerm {
  id: number;
  study_plan_stage_id: number;
  code: string;
  start_date: string;
  end_date: string;
  term_status_id: number;
  order: number;
  status?: IStudyPlanTermStatus | null;
}

export interface IStudyPlanGrade {
  id: number;
  name: string;
  description: string;
  order: number;
  active: boolean;
  level_id: number;
}

export interface IStudyPlanLevel {
  id: number;
  name: string;
  description: string;
  css_class: string | null;
  order: number;
  grades?: IStudyPlanGrade[];
}

export interface IStudyPlanStageSubjectsSummaryGrade {
  grade_id: number;
  name: string;
  description: string;
  subjects_count: number;
}

export interface IStudyPlanStageSubjectsSummary {
  total_subjects: number;
  crossovers_count: number;
  total_grades: number;
  configured_grades: number;
  grades: IStudyPlanStageSubjectsSummaryGrade[];
}

export interface IStudyPlanStageIntegration {
  id: number;
  study_plan_stage_id: number;
  code: string;
  name: string;
  monogram: string;
  active: boolean;
  order: number;
}

export interface IStudyPlanStage {
  id: number;
  study_plan_id: number;
  name: string;
  start_date: string;
  end_date: string;
  order: number;
  terms?: IStudyPlanTerm[];
  subjects_summary?: IStudyPlanStageSubjectsSummary | null;
  integrations?: IStudyPlanStageIntegration[];
}

export interface IStudyPlanStructure {
  id: number;
  name: string;
  translation: string;
  stages: number;
  stage_name: string;
  active: boolean;
  order: number;
}

type StudyPlanAcademicsPlan = StudyPlanConfigurationItem & {
  structure?: IStudyPlanStructure | null;
  level?: IStudyPlanLevel | null;
  stages?: IStudyPlanStage[];
};

@Component({
  selector: 'app-study-plan-academics',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    StudyPlanStagesSummaryComponent,
    StudyPlanStageComponent,
    StudyPlanSubjectsSummaryComponent,
    StudyPlanStageSubjectsComponent,
    StudyPlanIntegrationsSummaryComponent,
    StageIntegrationsComponent,
  ],
  templateUrl: './study-plan-academics.component.html',
  styleUrl: './study-plan-academics.component.scss',
})
export class StudyPlanAcademicsComponent extends SkolansBaseComponent implements OnInit, OnChanges {
  readonly studyPlan = input<StudyPlanConfigurationItem | null>(null);
  readonly route = input<string | null>(null);
  readonly refreshToken = input(0);

  constructor() {
    super();

    effect(() => {
      this.setStudyPlanAcademicsAssistantContext(this.academicPlan());
    });
  }

  protected readonly loadedStudyPlan = signal<StudyPlanAcademicsPlan | null>(null);

  protected readonly selectedStageId = signal<number | null>(null);
  protected readonly selectedSubjectStageId = signal<number | null>(null);
  protected readonly selectedSubjectGradeId = signal<number | null>(null);
  protected readonly selectedIntegrationStageId = signal<number | null>(null);

  protected readonly academicPlan = computed(() => {
    return (this.loadedStudyPlan() ?? this.studyPlan()) as StudyPlanAcademicsPlan | null;
  });

  protected readonly stages = computed<IStudyPlanStage[]>(() => {
    return this.academicPlan()?.stages ?? [];
  });

  protected readonly grades = computed<IStudyPlanGrade[]>(() => {
    return this.academicPlan()?.level?.grades ?? [];
  });

  protected readonly stagesChild = computed(() => this.getScreenChild('study-plan-stages'));
  protected readonly subjectsChild = computed(() => this.getScreenChild('study-plan-subjects'));
  protected readonly integrationsChild = computed(() =>
    this.getScreenChild('study-plan-integrations'),
  );

  ngOnInit(): void {
    this.initRouteMeta();
    this.loadOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['refreshToken'] && !changes['refreshToken'].firstChange) {
      this.loadOptions();
    }
  }

  protected loadOptions(): void {
    const route = this.route();

    if (!route) {
      return;
    }

    this.executeSilentRequest<{
      'study-plan'?: StudyPlanAcademicsPlan;
      options?: ScreenOptionItem[];
      children?: ScreenChildItem[];
    }>(this.api.get(route), (res) => {
      this.setScreenOptions(res.data.options);
      this.setScreenChildren(res.data.children);
      this.loadedStudyPlan.set(res.data['study-plan'] ?? null);
      this.setStudyPlanAcademicsAssistantContext(res.data['study-plan'] ?? null);
    });
  }

  /**
   * State ownership
   * ---------------
   * This component owns the canonical academics snapshot through
   * loadedStudyPlan. Child screens own their local editing state and emit the
   * updated academics stage after successful backend mutations. The parent
   * merges only the affected stage so summary cards refresh without treating
   * navigation back as a data-change signal.
   */
  protected updateStageSnapshot(updatedStage: IStudyPlanStage | null | undefined): void {
    if (!updatedStage) {
      return;
    }

    const currentPlan = this.loadedStudyPlan() ?? this.academicPlan();

    if (!currentPlan) {
      return;
    }

    const currentStages = currentPlan.stages ?? [];
    const stageExists = currentStages.some((stage) => stage.id === updatedStage.id);
    const updatedStages = stageExists
      ? currentStages.map((stage) =>
          stage.id === updatedStage.id ? this.mergeStageSnapshot(stage, updatedStage) : stage,
        )
      : [...currentStages, updatedStage].sort((a, b) => a.order - b.order);

    this.loadedStudyPlan.set({
      ...currentPlan,
      stages: updatedStages,
    });
  }

  protected removeStageSnapshot(stageId: number): void {
    const currentPlan = this.loadedStudyPlan() ?? this.academicPlan();

    if (!currentPlan) {
      return;
    }

    this.loadedStudyPlan.set({
      ...currentPlan,
      stages: (currentPlan.stages ?? []).filter((stage) => stage.id !== stageId),
    });
  }

  protected onStageDeleted(stageId: number): void {
    this.removeStageSnapshot(stageId);
    this.closeStage();
  }

  private setStudyPlanAcademicsAssistantContext(studyPlan: StudyPlanAcademicsPlan | null): void {
    if (!studyPlan) {
      return;
    }

    const stages = studyPlan.stages ?? [];
    const termsCount = stages.reduce((total, stage) => total + (stage.terms?.length ?? 0), 0);
    const totalSubjects = stages.reduce(
      (total, stage) => total + (stage.subjects_summary?.total_subjects ?? 0),
      0,
    );
    const totalIntegrations = stages.reduce(
      (total, stage) => total + (stage.integrations?.length ?? 0),
      0,
    );

    this.setAssistantContext({
      contextType: 'section',
      contextId: 'planning.study-plans.academics',
      feature: 'study-plans',
      title: 'controllers.study-plan-academics',
      subtitle: 'planning.study-plan-academics.description',
      entity: 'StudyPlan',
      mode: 'academics',
      data: {
        studyPlanId: studyPlan.id,
        studyPlanName: studyPlan.name,
        levelId: studyPlan.level_id,
        levelName: studyPlan.level?.description ?? studyPlan.level?.name ?? null,
        schoolYearId: studyPlan.school_year_id,
        sectionId: studyPlan.section_id,
        structureId: studyPlan.study_plan_structure_id,
        structureName: studyPlan.structure?.translation ?? studyPlan.structure?.name ?? null,
        stagesCount: stages.length,
        termsCount,
        gradesCount: studyPlan.level?.grades?.length ?? 0,
        totalSubjects,
        totalIntegrations,
        selectedStageId: this.selectedStageId(),
        selectedSubjectStageId: this.selectedSubjectStageId(),
        selectedSubjectGradeId: this.selectedSubjectGradeId(),
        selectedIntegrationStageId: this.selectedIntegrationStageId(),
        availableChildren: this.getAssistantAvailableChildren(),
        availableOptions: this.getAssistantAvailableOptions(),
        canManageStages: Boolean(this.stagesChild()),
        canManageSubjects: Boolean(this.subjectsChild()),
        canManageIntegrations: Boolean(this.integrationsChild()),
      },
    });
  }

  private mergeStageSnapshot(
    currentStage: IStudyPlanStage,
    updatedStage: IStudyPlanStage,
  ): IStudyPlanStage {
    return {
      ...currentStage,
      ...updatedStage,
      terms: updatedStage.terms ?? currentStage.terms,
      subjects_summary: updatedStage.subjects_summary ?? currentStage.subjects_summary,
      integrations: updatedStage.integrations ?? currentStage.integrations,
    };
  }

  protected childRoute(childName: string | null | undefined): string | null {
    if (!childName) {
      return null;
    }

    const parentRoute = this.apiRoute();
    const moduleRoute = parentRoute?.split('/')[0];

    if (!moduleRoute) {
      return null;
    }

    return `${moduleRoute}/${childName}`;
  }

  protected openStage(stageId: number): void {
    this.closeIntegrations();
    this.closeStageSubjects();
    this.selectedStageId.set(stageId);
  }

  protected closeStage(): void {
    this.selectedStageId.set(null);
  }

  protected openStageGradeSubjects(selection: StudyPlanStageGradeSelection): void {
    this.closeIntegrations();
    this.selectedStageId.set(null);
    this.selectedSubjectStageId.set(selection.stageId);
    this.selectedSubjectGradeId.set(selection.gradeId);
  }

  protected openStageCrossovers(stageId: number): void {
    this.closeIntegrations();
    this.selectedStageId.set(null);
    this.selectedSubjectStageId.set(stageId);
    this.selectedSubjectGradeId.set(null);
  }

  protected closeStageSubjects(): void {
    this.selectedSubjectStageId.set(null);
    this.selectedSubjectGradeId.set(null);
  }

  protected openIntegrations(stageId: number): void {
    const child = this.integrationsChild();

    if (!child) {
      return;
    }

    this.selectedStageId.set(null);
    this.closeStageSubjects();
    this.selectedIntegrationStageId.set(stageId);
  }

  protected closeIntegrations(): void {
    this.selectedIntegrationStageId.set(null);
  }

  protected openAddStage(): void {
    const route = this.apiRoute();
    const studyPlanId = this.academicPlan()?.id;

    if (!route || !studyPlanId) {
      return;
    }

    this.executeMutationRequest(this.api.post(`${route}/${studyPlanId}/restore-stages`, {}), () => {
      this.loadOptions();
    });
  }
}
