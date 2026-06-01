import { CommonModule } from '@angular/common';
import { Component, computed, input, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { ScreenChildItem, ScreenOptionItem } from '@shared/interfaces/configuration.interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';
import type { StudyPlanConfigurationItem } from '../study-plan-configuration/study-plan-configuration.component';
import { StudyPlanStagesSummaryComponent } from 'app/tenant/planning/study-plans/study-plan-stages-summary/study-plan-stages-summary.component';
import { StudyPlanStageComponent } from '../study-plan-stage/study-plan-stage.component';

export interface IStudyPlanTermStatus {
  id: number;
  name: string;
  translation: string;
  css_class: string | null;
  active: boolean;
  order: number;
}

export interface IStudyPlanTerm {
  id: number;
  study_plan_stage_id: number;
  code: string;
  name: string;
  alternate_name: string | null;
  start_date: string;
  end_date: string;
  review_date: string | null;
  exemption: boolean;
  attendance: boolean;
  comments: boolean;
  term_status_id: number;
  term_type_id: number;
  descriptive_sheet_type_id: number | null;
  order: number;
  status?: IStudyPlanTermStatus | null;
}

export interface IStudyPlanStage {
  id: number;
  study_plan_id: number;
  name: string;
  start_date: string;
  end_date: string;
  order: number;
  terms?: IStudyPlanTerm[];
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
  ],
  templateUrl: './study-plan-academics.component.html',
  styleUrl: './study-plan-academics.component.scss',
})
export class StudyPlanAcademicsComponent extends SkolansBaseComponent implements OnInit {
  readonly studyPlan = input<StudyPlanConfigurationItem | null>(null);
  readonly route = input<string | null>(null);

  protected readonly loadedStudyPlan = signal<StudyPlanAcademicsPlan | null>(null);
  protected readonly selectedStageId = signal<number | null>(null);

  protected readonly showingStageDetail = computed(() => this.selectedStageId() !== null);

  protected readonly academicPlan = computed(() => {
    return (this.loadedStudyPlan() ?? this.studyPlan()) as StudyPlanAcademicsPlan | null;
  });

  protected readonly stages = computed<IStudyPlanStage[]>(() => this.academicPlan()?.stages ?? []);

  protected readonly stagesCount = computed(() => this.stages().length);

  protected readonly termsTotal = computed(() => {
    return this.stages().reduce((total, stage) => {
      return total + (stage.terms?.length ?? 0);
    }, 0);
  });

  protected readonly hasStages = computed(() => this.stagesCount() > 0);

  protected readonly stagesChild = computed(() => this.getScreenChild('study-plan-stages'));
  protected readonly subjectsChild = computed(() => this.getScreenChild('study-plan-subjects'));
  protected readonly integrationsChild = computed(() =>
    this.getScreenChild('study-plan-integrations'),
  );

  protected readonly closedTermsCount = computed(() => {
    return this.stages().reduce((total, stage) => {
      return total + (stage.terms ?? []).filter((term) => term.status?.name === 'closed').length;
    }, 0);
  });

  protected readonly openTermsCount = computed(() => {
    return this.stages().reduce((total, stage) => {
      return total + (stage.terms ?? []).filter((term) => term.status?.name === 'open').length;
    }, 0);
  });

  protected readonly activeTerm = computed(() => {
    return this.stages()
      .flatMap((stage) => stage.terms ?? [])
      .find((term) => term.status?.name === 'open');
  });

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
    this.selectedStageId.set(stageId);
  }

  protected closeStage(): void {
    console.log('back');
    this.selectedStageId.set(null);
  }

  protected openSubjects(): void {
    const child = this.subjectsChild();

    if (!child) {
      return;
    }
  }

  protected openIntegrations(): void {
    const child = this.integrationsChild();

    if (!child) {
      return;
    }
  }

  openAddStage() {}
}
