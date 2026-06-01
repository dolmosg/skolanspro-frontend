import { CommonModule } from '@angular/common';
import { Component, computed, input, OnInit, output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import {
  ScreenChildItem,
  ScreenOptionItem,
} from '@shared/interfaces/configuration.interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

export interface IStudyPlanStageStatus {
  id: number;
  name: string;
  translation: string;
  css_class: string | null;
  active: boolean;
  order: number;
}

export interface IStudyPlanStageTerm {
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
  status?: IStudyPlanStageStatus | null;
}

export interface IStudyPlanStageStructure {
  id: number;
  name: string;
  translation: string;
  stages: number;
  stage_name: string;
}

export interface IStudyPlanStagePlan {
  id: number;
  name: string;
  studyplan_structure_id: number;
  structure?: IStudyPlanStageStructure | null;
}

export interface IStudyPlanStageDetail {
  id: number;
  study_plan_id: number;
  name: string;
  start_date: string;
  end_date: string;
  order: number;
  study_plan?: IStudyPlanStagePlan | null;
  terms?: IStudyPlanStageTerm[];
}

interface StudyPlanStageShowResponse {
  study_plan_stage?: IStudyPlanStageDetail | null;
  options?: ScreenOptionItem[];
  children?: ScreenChildItem[];
}

type StudyPlanStageSelectionType = 'stage' | 'term';

@Component({
  selector: 'app-study-plan-stage',
  standalone: true,
  imports: [CommonModule, TranslateModule, UiButtonComponent, UiIconComponent],
  templateUrl: './study-plan-stage.component.html',
  styleUrl: './study-plan-stage.component.scss',
})
export class StudyPlanStageComponent extends SkolansBaseComponent implements OnInit {
  readonly stageId = input<number | null>(null);
  readonly route = input<string | null>(null);

  readonly back = output<void>();

  protected readonly stage = signal<IStudyPlanStageDetail | null>(null);

  protected readonly selectedType = signal<StudyPlanStageSelectionType>('stage');
  protected readonly selectedTermId = signal<number | null>(null);

  protected readonly terms = computed(() => this.stage()?.terms ?? []);

  protected readonly termsCount = computed(() => this.terms().length);

  protected readonly stageName = computed(() => this.stage()?.name ?? '');

  protected readonly studyPlanName = computed(() => this.stage()?.study_plan?.name ?? '');

  protected readonly structureName = computed(() => {
    const structure = this.stage()?.study_plan?.structure;

    return structure?.translation || structure?.name || '';
  });

  protected readonly selectedTerm = computed(() => {
    const selectedId = this.selectedTermId();

    if (!selectedId) {
      return null;
    }

    return this.terms().find((term) => term.id === selectedId) ?? null;
  });

  protected readonly isStageSelected = computed(() => this.selectedType() === 'stage');

  protected readonly hasTerms = computed(() => this.terms().length > 0);

  protected readonly selectedTitle = computed(() => {
    if (this.isStageSelected()) {
      return this.stageName();
    }

    const term = this.selectedTerm();

    return term?.code || term?.name || '';
  });

  ngOnInit(): void {
    this.initRouteMeta();
    this.loadStage();
  }

  protected loadStage(): void {
    const route = this.route();
    const stageId = this.stageId();

    if (!route || !stageId) {
      return;
    }

    this.executeSilentRequest<StudyPlanStageShowResponse>(
      this.api.get(`${route}/${stageId}`),
      (res) => {
        const loadedStage = res.data.study_plan_stage ?? null;

        this.stage.set(loadedStage);
        this.setScreenOptions(res.data.options);
        this.setScreenChildren(res.data.children);

        this.selectStage();
      },
    );
  }

  protected selectStage(): void {
    this.selectedType.set('stage');
    this.selectedTermId.set(null);
  }

  protected selectTerm(term: IStudyPlanStageTerm): void {
    this.selectedType.set('term');
    this.selectedTermId.set(term.id);
  }

  protected isTermSelected(term: IStudyPlanStageTerm): boolean {
    return this.selectedType() === 'term' && this.selectedTermId() === term.id;
  }

  protected onBack(): void {
    this.back.emit();
  }
}