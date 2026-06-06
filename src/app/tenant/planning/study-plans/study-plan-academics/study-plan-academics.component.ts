import { CommonModule } from '@angular/common';
import { Component, computed, input, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { ScreenChildItem, ScreenOptionItem } from '@shared/interfaces/configuration.interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import type { StudyPlanConfigurationItem } from '../study-plan-configuration/study-plan-configuration.component';
import { StudyPlanStagesSummaryComponent } from '../study-plan-stages-summary/study-plan-stages-summary.component';
import { StudyPlanStageComponent } from '../study-plan-stage/study-plan-stage.component';
import {
  StudyPlanSubjectsSummaryComponent,
  type StudyPlanStageGradeSelection,
} from '../study-plan-subjects-summary/study-plan-subjects-summary.component';
import { StudyPlanStageSubjectsComponent } from '../study-plan-stage-subjects/study-plan-stage-subjects.component';

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

export interface IStudyPlanStage {
  id: number;
  study_plan_id: number;
  name: string;
  start_date: string;
  end_date: string;
  order: number;
  terms?: IStudyPlanTerm[];
  subjects_summary?: IStudyPlanStageSubjectsSummary | null;
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
    UiButtonComponent,
    UiIconComponent,
    StudyPlanStagesSummaryComponent,
    StudyPlanStageComponent,
    StudyPlanSubjectsSummaryComponent,
    StudyPlanStageSubjectsComponent,
  ],
  templateUrl: './study-plan-academics.component.html',
  styleUrl: './study-plan-academics.component.scss',
})
export class StudyPlanAcademicsComponent extends SkolansBaseComponent implements OnInit {
  readonly studyPlan = input<StudyPlanConfigurationItem | null>(null);
  readonly route = input<string | null>(null);

  protected readonly loadedStudyPlan = signal<StudyPlanAcademicsPlan | null>(null);

  protected readonly selectedStageId = signal<number | null>(null);
  protected readonly selectedSubjectStageId = signal<number | null>(null);
  protected readonly selectedSubjectGradeId = signal<number | null>(null);

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
    });
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
    this.closeStageSubjects();
    this.selectedStageId.set(stageId);
  }

  protected closeStage(): void {
    this.selectedStageId.set(null);
  }

  protected openStageGradeSubjects(selection: StudyPlanStageGradeSelection): void {
    this.selectedStageId.set(null);
    this.selectedSubjectStageId.set(selection.stageId);
    this.selectedSubjectGradeId.set(selection.gradeId);
  }

  protected openStageCrossovers(stageId: number): void {
    this.selectedStageId.set(null);
    this.selectedSubjectStageId.set(stageId);
    this.selectedSubjectGradeId.set(null);
  }

  protected closeStageSubjects(): void {
    this.selectedSubjectStageId.set(null);
    this.selectedSubjectGradeId.set(null);
  }

  protected openIntegrations(): void {
    const child = this.integrationsChild();

    if (!child) {
      return;
    }
  }

  protected openAddStage(): void {}
}