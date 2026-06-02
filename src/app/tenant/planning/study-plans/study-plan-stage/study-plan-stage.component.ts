import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { ScreenChildItem, ScreenOptionItem } from '@shared/interfaces/configuration.interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';
import { StudyPlanTermComponent } from '../study-plan-term/study-plan-term.component';

export interface IStudyPlanStageStatus {
  id: number;
  name: string;
  translation: string;
  css_class: string | null;
  active: boolean;
  order: number;
}

export interface IStudyPlanStageTermType {
  id: number;
  name: string;
  translation: string;
  active: boolean;
  order: number;
}

export interface IStudyPlanStageDescriptiveSheetType {
  id: number;
  name: string;
  translation: string;
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

interface StudyPlanTermsCatalogs {
  term_statuses?: IStudyPlanStageStatus[];
  term_types?: IStudyPlanStageTermType[];
  descriptive_sheet_types?: IStudyPlanStageDescriptiveSheetType[];
}

interface StudyPlanTermsIndexResponse {
  options?: ScreenOptionItem[];
  catalogs?: StudyPlanTermsCatalogs;
}

type StudyPlanStageSelectionType = 'stage' | 'term';
type StudyPlanStageMode = 'view' | 'edit';

@Component({
  selector: 'app-study-plan-stage',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    UiButtonComponent,
    UiIconComponent,
    StudyPlanTermComponent,
  ],
  templateUrl: './study-plan-stage.component.html',
  styleUrl: './study-plan-stage.component.scss',
})
export class StudyPlanStageComponent extends SkolansBaseComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly stageId = input<number | null>(null);
  readonly route = input<string | null>(null);

  readonly back = output<void>();

  protected readonly stage = signal<IStudyPlanStageDetail | null>(null);

  protected readonly selectedType = signal<StudyPlanStageSelectionType>('stage');
  protected readonly selectedTermId = signal<number | null>(null);
  protected readonly creatingTerm = signal(false);

  protected readonly stageMode = signal<StudyPlanStageMode>('view');
  protected readonly savingStage = signal(false);

  protected readonly termOptions = signal<ScreenOptionItem[]>([]);
  protected readonly termStatuses = signal<IStudyPlanStageStatus[]>([]);
  protected readonly termTypes = signal<IStudyPlanStageTermType[]>([]);
  protected readonly descriptiveSheetTypes = signal<IStudyPlanStageDescriptiveSheetType[]>([]);

  protected readonly stageForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    start_date: ['', [Validators.required]],
    end_date: ['', [Validators.required]],
    order: [0, [Validators.required, Validators.min(0)]],
  });

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

  protected readonly isStageViewMode = computed(() => this.stageMode() === 'view');
  protected readonly isStageEditMode = computed(() => this.stageMode() === 'edit');

  protected readonly termsChild = computed(() => {
    return this.getScreenChild('study-plan-stage-terms');
  });

  protected readonly termRoute = computed(() => {
    const route = this.route();
    const child = this.termsChild();

    if (!route || !child?.name) {
      return null;
    }

    const segments = route.split('/').filter(Boolean);

    segments.pop();
    segments.push(child.name);

    return segments.join('/');
  });

  protected readonly addTermOption = computed(() => {
    return this.termOptions().find((option) => option.name === 'add') ?? null;
  });

  protected readonly updateStageOption = computed(() => {
    return this.getScreenOption('update') ?? this.getScreenOption('update-stage') ?? null;
  });

  protected readonly deleteStageOption = computed(() => {
    return this.getScreenOption('delete') ?? this.getScreenOption('delete-stage') ?? null;
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

        if (loadedStage) {
          this.patchStageForm(loadedStage);
        }

        this.loadTermContext();
        this.selectStage();
      },
    );
  }

  protected loadTermContext(): void {
    const route = this.termRoute();

    if (!route) {
      this.clearTermContext();
      return;
    }

    this.executeSilentRequest<StudyPlanTermsIndexResponse>(this.api.get(route), (res) => {
      const catalogs = res.data.catalogs ?? {};

      this.termOptions.set(res.data.options ?? []);
      this.termStatuses.set(catalogs.term_statuses ?? []);
      this.termTypes.set(catalogs.term_types ?? []);
      this.descriptiveSheetTypes.set(catalogs.descriptive_sheet_types ?? []);
    });
  }

  protected clearTermContext(): void {
    this.termOptions.set([]);
    this.termStatuses.set([]);
    this.termTypes.set([]);
    this.descriptiveSheetTypes.set([]);
  }

  protected selectStage(): void {
    this.selectedType.set('stage');
    this.selectedTermId.set(null);
    this.creatingTerm.set(false);
  }

  protected selectTerm(term: IStudyPlanStageTerm): void {
    this.selectedType.set('term');
    this.selectedTermId.set(term.id);
    this.creatingTerm.set(false);
    this.stageMode.set('view');
  }

  protected isTermSelected(term: IStudyPlanStageTerm): boolean {
    return this.selectedType() === 'term' && this.selectedTermId() === term.id;
  }

  protected createTerm(): void {
    if (!this.addTermOption()) {
      return;
    }

    this.selectedType.set('term');
    this.selectedTermId.set(null);
    this.creatingTerm.set(true);
    this.stageMode.set('view');
  }

  protected closeTermPanel(): void {
    this.creatingTerm.set(false);
    this.loadStage();
  }

  protected editStage(): void {
    const stage = this.stage();

    if (!stage || !this.updateStageOption()) {
      return;
    }

    this.patchStageForm(stage);
    this.stageMode.set('edit');
  }

  protected cancelStageEdit(): void {
    const stage = this.stage();

    if (stage) {
      this.patchStageForm(stage);
    }

    this.stageMode.set('view');
  }

  protected saveStage(): void {
    const route = this.route();
    const stage = this.stage();

    if (!route || !stage || !this.updateStageOption()) {
      return;
    }

    if (this.stageForm.invalid) {
      this.stageForm.markAllAsTouched();
      return;
    }

    this.savingStage.set(true);

    this.executeSilentRequest(
      this.api.put(`${route}/${stage.id}`, this.stageForm.getRawValue()),
      () => {
        this.savingStage.set(false);
        this.stageMode.set('view');
        this.loadStage();
      },
      () => {
        this.savingStage.set(false);
      },
    );
  }

  protected deleteStage(): void {
    const route = this.route();
    const stage = this.stage();

    if (!route || !stage || !this.deleteStageOption()) {
      return;
    }

    this.executeSilentRequest(this.api.delete(`${route}/${stage.id}`), () => {
      this.back.emit();
    });
  }

  protected onBack(): void {
    this.back.emit();
  }

  private patchStageForm(stage: IStudyPlanStageDetail): void {
    this.stageForm.patchValue({
      name: stage.name,
      start_date: this.toDateInputValue(stage.start_date),
      end_date: this.toDateInputValue(stage.end_date),
      order: stage.order,
    });
  }

  private toDateInputValue(value: string | null): string {
    return value ? value.slice(0, 10) : '';
  }
}