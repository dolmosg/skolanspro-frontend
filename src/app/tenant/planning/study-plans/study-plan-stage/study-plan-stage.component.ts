import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { ScreenChildItem, ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { FormErrorComponent } from '@shared/ui/form-error/form-error';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';
import { StudyPlanTermComponent } from '../study-plan-term/study-plan-term.component';
import { DateValidators } from '@shared/validators/date.validators';
import type { IStudyPlanStage as IStudyPlanAcademicsStage } from '../study-plan-academics/study-plan-academics.component';

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
  study_plan_structure_id: number;
  start?: string | null;
  end?: string | null;
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
  academics_stage?: IStudyPlanAcademicsStage | null;
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
    FormErrorComponent,
  ],
  templateUrl: './study-plan-stage.component.html',
  styleUrl: './study-plan-stage.component.scss',
})
export class StudyPlanStageComponent extends SkolansBaseComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly stageId = input<number | null>(null);
  readonly route = input<string | null>(null);

  readonly back = output<void>();
  readonly academicsStageUpdated = output<IStudyPlanAcademicsStage>();
  readonly stageDeleted = output<number>();

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

  protected readonly stageForm = this.fb.group(
    {
      name: ['', [Validators.required, Validators.maxLength(45)]],
      start_date: ['', [Validators.required]],
      end_date: ['', [Validators.required]],
      order: [0, [Validators.required, Validators.min(0)]],
    },
    {
      validators: [DateValidators.after('start_date', 'stageEndBeforeStart')],
    },
  );

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

  protected loadStage(options?: { keepSelectedTermId?: number | null }): void {
    const route = this.route();
    const stageId = this.stageId();

    if (!route || !stageId) {
      return;
    }

    this.executeSilentRequest<StudyPlanStageShowResponse>(
      this.api.get(`${route}/${stageId}`),
      (res) => {
        const loadedStage = res.data.study_plan_stage ?? null;
        const keepSelectedTermId = options?.keepSelectedTermId ?? null;

        this.stage.set(loadedStage);
        this.setScreenOptions(res.data.options);
        this.setScreenChildren(res.data.children);
        this.emitAcademicsStageSnapshot(res.data.academics_stage);

        if (loadedStage) {
          this.patchStageForm(loadedStage);
        }

        this.loadTermContext();

        if (
          keepSelectedTermId &&
          loadedStage?.terms?.some((term) => term.id === keepSelectedTermId)
        ) {
          this.selectedType.set('term');
          this.selectedTermId.set(keepSelectedTermId);
          this.creatingTerm.set(false);
          this.stageMode.set('view');
          this.setStudyPlanStageAssistantContext();
          return;
        }

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
      this.setStudyPlanStageAssistantContext();
    });
  }

  protected clearTermContext(): void {
    this.termOptions.set([]);
    this.termStatuses.set([]);
    this.termTypes.set([]);
    this.descriptiveSheetTypes.set([]);

    if (this.stage()) {
      this.setStudyPlanStageAssistantContext();
    }
  }

  protected selectStage(): void {
    this.selectedType.set('stage');
    this.selectedTermId.set(null);
    this.creatingTerm.set(false);
    this.setStudyPlanStageAssistantContext();
  }

  protected selectTerm(term: IStudyPlanStageTerm): void {
    this.selectedType.set('term');
    this.selectedTermId.set(term.id);
    this.creatingTerm.set(false);
    this.stageMode.set('view');
    this.setStudyPlanStageAssistantContext();
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
    this.setStudyPlanStageAssistantContext();
  }

  protected closeTermPanel(): void {
    const selectedTermId = this.selectedTermId();

    this.creatingTerm.set(false);
    this.loadStage({
      keepSelectedTermId: selectedTermId,
    });
  }

  protected editStage(): void {
    const stage = this.stage();

    if (!stage || !this.updateStageOption()) {
      return;
    }

    this.patchStageForm(stage);
    this.stageMode.set('edit');
    this.setStudyPlanStageAssistantContext();
  }

  protected cancelStageEdit(): void {
    const stage = this.stage();

    if (stage) {
      this.patchStageForm(stage);
    }

    this.stageMode.set('view');
    this.setStudyPlanStageAssistantContext();
  }

  private setStudyPlanStageAssistantContext(): void {
    const stage = this.stage();

    if (!stage) {
      return;
    }

    const selectedType = this.selectedType();
    const stageMode = this.stageMode();
    const creatingTerm = this.creatingTerm();
    const selectedTerm = this.selectedTerm();
    const studyPlan = stage.study_plan ?? null;

    this.setAssistantContext({
      contextType: stageMode === 'edit' ? 'editor' : 'component',
      contextId: 'planning.study-plans.academics.stages',
      feature: 'study-plans',
      title: stage.name,
      subtitle: studyPlan?.name ?? 'planning.study-plan-stages.title',
      entity: 'StudyPlanStage',
      mode:
        stageMode === 'edit'
          ? 'stage-editing'
          : creatingTerm
            ? 'term-creating'
            : selectedType === 'term'
              ? 'term-selected'
              : 'stage-overview',
      data: {
        studyPlanId: studyPlan?.id ?? stage.study_plan_id,
        studyPlanName: studyPlan?.name ?? null,
        stageId: stage.id,
        stageName: stage.name,
        stageStartDate: stage.start_date,
        stageEndDate: stage.end_date,
        stageOrder: stage.order,
        structureId: studyPlan?.study_plan_structure_id ?? null,
        structureName: studyPlan?.structure?.translation ?? studyPlan?.structure?.name ?? null,
        termsCount: this.termsCount(),
        selectedType,
        selectedTermId: this.selectedTermId(),
        selectedTermName: selectedTerm?.name ?? null,
        creatingTerm,
        stageMode,
        canUpdateStage: Boolean(this.updateStageOption()),
        canDeleteStage: Boolean(this.deleteStageOption()),
        canAddTerm: Boolean(this.addTermOption()),
        hasTermsChild: Boolean(this.termsChild()),
        hasTermRoute: Boolean(this.termRoute()),
        termStatusesCount: this.termStatuses().length,
        termTypesCount: this.termTypes().length,
        descriptiveSheetTypesCount: this.descriptiveSheetTypes().length,
        availableChildren: this.getAssistantAvailableChildren(),
        availableOptions: this.getAssistantAvailableOptions(),
      },
    });
  }

  protected saveStage(): void {
    const route = this.route();
    const stage = this.stage();

    if (!route || !stage || !this.updateStageOption()) {
      return;
    }

    this.stageForm.markAllAsTouched();
    this.stageForm.updateValueAndValidity();

    if (this.stageForm.invalid) {
      return;
    }

    this.savingStage.set(true);

    this.executeSilentRequest<StudyPlanStageShowResponse>(
      this.api.put(`${route}/${stage.id}`, this.stageForm.getRawValue()),
      (res) => {
        this.savingStage.set(false);
        this.stageMode.set('view');
        const updatedStage = res.data.study_plan_stage ?? null;

        if (updatedStage) {
          this.stage.update((currentStage) => ({
            ...(currentStage ?? updatedStage),
            ...updatedStage,
          }));
          this.patchStageForm(updatedStage);
        }

        this.emitAcademicsStageSnapshot(res.data.academics_stage);
        this.setStudyPlanStageAssistantContext();
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
      this.stageDeleted.emit(stage.id);
    });
  }

  protected onBack(): void {
    this.back.emit();
  }

  private patchStageForm(stage: IStudyPlanStageDetail): void {
    this.applyStageDateValidators(stage);

    this.stageForm.patchValue({
      name: stage.name,
      start_date: this.toDateInputValue(stage.start_date),
      end_date: this.toDateInputValue(stage.end_date),
      order: stage.order,
    });

    this.stageForm.updateValueAndValidity();
  }

  private emitAcademicsStageSnapshot(
    stage: IStudyPlanAcademicsStage | null | undefined,
  ): void {
    if (!stage) {
      return;
    }

    this.academicsStageUpdated.emit(stage);
  }

  private applyStageDateValidators(stage: IStudyPlanStageDetail): void {
    const planStart = this.toDateInputValue(stage.study_plan?.start ?? null);
    const planEnd = this.toDateInputValue(stage.study_plan?.end ?? null);

    this.stageForm.controls.start_date.setValidators([
      Validators.required,
      DateValidators.range(planStart, planEnd),
    ]);

    this.stageForm.controls.end_date.setValidators([
      Validators.required,
      DateValidators.range(planStart, planEnd),
    ]);
  }

  private toDateInputValue(value: string | null | undefined): string {
    return value ? value.slice(0, 10) : '';
  }
}
