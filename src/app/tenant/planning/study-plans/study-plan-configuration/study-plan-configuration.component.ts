import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import {
  Component,
  DestroyRef,
  OnChanges,
  OnInit,
  SimpleChanges,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import {
  ISklConfirmModalData,
  SklConfirmModal,
} from '@shared/base/skl-confirm-modal/skl-confirm-modal';
import { ScreenChildItem, ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';
import { StudyPlanAcademicsComponent } from '../study-plan-academics/study-plan-academics.component';
import { StudyPlanEvaluationComponent } from '../study-plan-evaluation/study-plan-evaluation.component';
import { StudyPlanOrganizationComponent } from '../study-plan-organization/study-plan-organization.component';

export interface StudyPlanConfigurationItem {
  id: number;
  name: string;
  description: string | null;
  start: string;
  end: string;
  level_id: number;
  school_year_id: number;
  section_id: number;
  study_plan_structure_id: number;
  schedule_type_id: number;
  structure?: {
    id: number;
    name: string;
    translation: string | null;
  } | null;
  schedule_type?: {
    id: number;
    name: string;
    translation: string | null;
  } | null;
  level?: {
    id: number;
    name: string;
    description: string | null;
  } | null;
  school_year?: {
    id: number;
    name: string;
  } | null;
  section?: {
    id: number;
    name: string;
    description: string | null;
    capital?: string | null;
  } | null;
  grading_settings?: StudyPlanGradingSettings | null;
  attendance_settings?: StudyPlanAttendanceSettings | null;
  lms_settings?: StudyPlanLmsSettings | null;
}

export interface StudyPlanGradingSettings {
  id: number;
  study_plan_id: number;
  grading_scale_id: number;
  grade_policy_id: number;
  aspect_mode_id: number;
  comment_type_id: number;
  decimals: number;
  class_percent: string | number;
  exam_percent: string | number;
  exemptions: boolean;
  exemption_average: string | number | null;
  exemption_percent: string | number | null;
}

export interface StudyPlanAttendanceSettings {
  id: number;
  study_plan_id: number;
  attendance_type_id: number;
  attendance_calculation_id: number;
  attendance_details: boolean;
  delay_absence_ratio: number;
  attendance_delay: number;
  attendance_percent: string | number;
}

export interface StudyPlanLmsSettings {
  id: number;
  study_plan_id: number;
  enabled: boolean;
  skills_scale_id: number | null;
  performance_scale_id: number | null;
}

export interface StudyPlanConfigurationBasicCatalogItem {
  id: number;
  name: string;
  description?: string | null;
  translation?: string | null;
  help_translation?: string | null;
  order?: number;
  active?: boolean | number;
}

export interface StudyPlanConfigurationGradingScaleCatalogItem extends StudyPlanConfigurationBasicCatalogItem {
  minimum: number;
  maximum: number;
}

export interface StudyPlanConfigurationGradePolicyCatalogItem extends StudyPlanConfigurationBasicCatalogItem {
  configurable?: boolean;
}

export interface StudyPlanConfigurationStructureCatalogItem {
  id: number;
  name: string;
  translation: string | null;
  stages?: number;
  stage_name?: string | null;
  order?: number;
}

export interface StudyPlanConfigurationScheduleTypeCatalogItem {
  id: number;
  name: string;
  translation: string | null;
  order?: number;
}

export interface StudyPlanConfigurationCatalogs {
  levels?: StudyPlanConfigurationBasicCatalogItem[];
  school_years?: StudyPlanConfigurationBasicCatalogItem[];
  sections?: StudyPlanConfigurationBasicCatalogItem[];
  study_plan_structures?: StudyPlanConfigurationStructureCatalogItem[];
  schedule_types?: StudyPlanConfigurationScheduleTypeCatalogItem[];
  grading_scales?: StudyPlanConfigurationGradingScaleCatalogItem[];
  grade_policies?: StudyPlanConfigurationGradePolicyCatalogItem[];
  aspect_modes?: StudyPlanConfigurationBasicCatalogItem[];
  comment_types?: StudyPlanConfigurationBasicCatalogItem[];
  attendance_types?: StudyPlanConfigurationBasicCatalogItem[];
  attendance_calculations?: StudyPlanConfigurationBasicCatalogItem[];
  skill_scales?: StudyPlanConfigurationBasicCatalogItem[];
  performance_scales?: StudyPlanConfigurationBasicCatalogItem[];
}

type StudyPlanConfigurationCatalogKey = keyof StudyPlanConfigurationCatalogs;

type StudyPlanConfigurationCatalogItem =
  | StudyPlanConfigurationBasicCatalogItem
  | StudyPlanConfigurationGradingScaleCatalogItem
  | StudyPlanConfigurationGradePolicyCatalogItem
  | StudyPlanConfigurationStructureCatalogItem
  | StudyPlanConfigurationScheduleTypeCatalogItem;

type AssistantCatalogOption = StudyPlanConfigurationCatalogItem & {
  translatedLabel?: string;
  helpText?: string;
};

export interface StudyPlanConfigurationData {
  'study-plan'?: StudyPlanConfigurationItem;
  children?: ScreenChildItem[];
  options?: ScreenOptionItem[];
  catalogs?: StudyPlanConfigurationCatalogs;
}

export interface StudyPlanChildSelection {
  child: ScreenChildItem;
  studyPlan: StudyPlanConfigurationItem;
}

interface StudyPlanUpdatePayload {
  study_plan: {
    name: string;
    description: string | null;
    start: string;
    end: string;
    level_id: number;
    school_year_id: number;
    section_id: number;
    study_plan_structure_id: number;
    schedule_type_id: number;
  };
  grading_settings: {
    grading_scale_id: number;
    grade_policy_id: number;
    aspect_mode_id: number;
    comment_type_id: number;
    decimals: number;
    class_percent: number;
    exam_percent: number;
    exemptions: boolean;
    exemption_average: number | null;
    exemption_percent: number | null;
  };
  attendance_settings: {
    attendance_type_id: number;
    attendance_calculation_id: number;
    attendance_details: boolean;
    delay_absence_ratio: number;
    attendance_delay: number;
    attendance_percent: number;
  };
  lms_settings: {
    enabled: boolean;
    skills_scale_id: number | null;
    performance_scale_id: number | null;
  };
}

interface StudyPlanUpdateData {
  'study-plan'?: StudyPlanConfigurationItem;
  restructured?: boolean;
}

interface StudyPlanRestructureValidationData {
  viable: boolean;
  requires_confirmation: boolean;
}

type AssistantEditingFieldType = 'text' | 'date' | 'number' | 'percent' | 'boolean' | 'catalog';

interface AssistantEditingFieldDefinition {
  path: string;
  label: string;
  type: AssistantEditingFieldType;
  catalogKey?: StudyPlanConfigurationCatalogKey;
  rules?: string[];
}

interface AssistantEditingFieldContext {
  path: string;
  label: string;
  type: AssistantEditingFieldType;
  value: unknown;
  disabled: boolean;
  valid: boolean;
  touched: boolean;
  dirty: boolean;
  errors: ValidationErrors | null;
  catalogKey?: StudyPlanConfigurationCatalogKey;
  selectedOption?: AssistantCatalogOption | null;
  availableOptions?: AssistantCatalogOption[];
  rules?: string[];
}

@Component({
  selector: 'app-study-plan-configuration',
  imports: [
    UiButtonComponent,
    UiIconComponent,
    TranslatePipe,
    DatePipe,
    ReactiveFormsModule,
    StudyPlanAcademicsComponent,
    StudyPlanEvaluationComponent,
    StudyPlanOrganizationComponent,
  ],
  templateUrl: './study-plan-configuration.component.html',
  styleUrl: './study-plan-configuration.component.scss',
})
export class StudyPlanConfigurationComponent
  extends SkolansBaseComponent
  implements OnInit, OnChanges
{
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly selectedStudyPlanId = input<number | null>(null);
  readonly studyPlanChildSelected = output<StudyPlanChildSelection>();
  readonly studyPlanDeleteRequested = output<void>();
  readonly studyPlanUpdated = output<StudyPlanConfigurationItem>();

  protected readonly studyPlan = signal<StudyPlanConfigurationItem | null>(null);
  protected readonly catalogs = signal<StudyPlanConfigurationCatalogs>({});
  protected readonly activeSection = signal<string | null>(null);
  protected readonly academicsRefreshToken = signal(0);

  protected readonly editMode = signal<boolean>(false);

  private readonly assistantEditingFieldDefinitions: AssistantEditingFieldDefinition[] = [
    {
      path: 'study_plan.name',
      label: 'planning.study-plans.fields.name',
      type: 'text',
      rules: ['required', 'max_length_70'],
    },
    {
      path: 'study_plan.description',
      label: 'planning.study-plans.fields.description',
      type: 'text',
      rules: ['nullable', 'max_length_150'],
    },
    {
      path: 'study_plan.start',
      label: 'planning.study-plans.fields.start',
      type: 'date',
      rules: ['required'],
    },
    {
      path: 'study_plan.end',
      label: 'planning.study-plans.fields.end',
      type: 'date',
      rules: ['required', 'end_after_or_equal_start'],
    },
    {
      path: 'study_plan.level_id',
      label: 'planning.study-plans.fields.level',
      type: 'catalog',
      catalogKey: 'levels',
      rules: ['required', 'unique_level_school_year_section'],
    },
    {
      path: 'study_plan.school_year_id',
      label: 'planning.study-plans.fields.school-year',
      type: 'catalog',
      catalogKey: 'school_years',
      rules: ['required', 'unique_level_school_year_section'],
    },
    {
      path: 'study_plan.section_id',
      label: 'planning.study-plans.fields.section',
      type: 'catalog',
      catalogKey: 'sections',
      rules: ['required', 'unique_level_school_year_section'],
    },
    {
      path: 'study_plan.study_plan_structure_id',
      label: 'planning.study-plans.fields.structure',
      type: 'catalog',
      catalogKey: 'study_plan_structures',
      rules: ['required', 'changing_structure_requires_confirmation'],
    },
    {
      path: 'study_plan.schedule_type_id',
      label: 'planning.study-plans.fields.schedule-type',
      type: 'catalog',
      catalogKey: 'schedule_types',
      rules: ['required'],
    },
    {
      path: 'grading_settings.grading_scale_id',
      label: 'planning.study-plans.fields.grading-scale',
      type: 'catalog',
      catalogKey: 'grading_scales',
      rules: ['required'],
    },
    {
      path: 'grading_settings.grade_policy_id',
      label: 'planning.study-plans.fields.grade-policy',
      type: 'catalog',
      catalogKey: 'grade_policies',
      rules: ['required'],
    },
    {
      path: 'grading_settings.aspect_mode_id',
      label: 'planning.study-plans.fields.aspect-mode',
      type: 'catalog',
      catalogKey: 'aspect_modes',
      rules: ['required'],
    },
    {
      path: 'grading_settings.comment_type_id',
      label: 'planning.study-plans.fields.comment-type',
      type: 'catalog',
      catalogKey: 'comment_types',
      rules: ['required'],
    },
    {
      path: 'grading_settings.decimals',
      label: 'planning.study-plans.fields.decimals',
      type: 'number',
      rules: ['required', 'integer', 'min_0', 'max_4'],
    },
    {
      path: 'grading_settings.class_percent',
      label: 'planning.study-plans.fields.class-percent',
      type: 'percent',
      rules: [
        'required',
        'value_between_0_and_1',
        'blur_normalizes_values_above_1',
        'class_plus_exam_equals_1',
      ],
    },
    {
      path: 'grading_settings.exam_percent',
      label: 'planning.study-plans.fields.exam-percent',
      type: 'percent',
      rules: [
        'required',
        'value_between_0_and_1',
        'blur_normalizes_values_above_1',
        'class_plus_exam_equals_1',
      ],
    },
    {
      path: 'grading_settings.exemptions',
      label: 'planning.study-plans.fields.exemptions',
      type: 'boolean',
    },
    {
      path: 'grading_settings.exemption_average',
      label: 'planning.study-plans.fields.exemption-average',
      type: 'number',
      rules: ['nullable', 'min_0'],
    },
    {
      path: 'grading_settings.exemption_percent',
      label: 'planning.study-plans.fields.exemption-percent',
      type: 'percent',
      rules: ['nullable', 'value_between_0_and_1', 'blur_normalizes_values_above_1'],
    },
    {
      path: 'attendance_settings.attendance_type_id',
      label: 'planning.study-plans.fields.attendance-type',
      type: 'catalog',
      catalogKey: 'attendance_types',
      rules: ['required'],
    },
    {
      path: 'attendance_settings.attendance_calculation_id',
      label: 'planning.study-plans.fields.attendance-calculation',
      type: 'catalog',
      catalogKey: 'attendance_calculations',
      rules: ['required'],
    },
    {
      path: 'attendance_settings.attendance_details',
      label: 'planning.study-plans.fields.attendance-details',
      type: 'boolean',
    },
    {
      path: 'attendance_settings.delay_absence_ratio',
      label: 'planning.study-plans.fields.delay-absence-ratio',
      type: 'number',
      rules: ['required', 'integer', 'min_0'],
    },
    {
      path: 'attendance_settings.attendance_delay',
      label: 'planning.study-plans.fields.attendance-delay',
      type: 'number',
      rules: ['required', 'integer', 'min_0'],
    },
    {
      path: 'attendance_settings.attendance_percent',
      label: 'planning.study-plans.fields.attendance-percent',
      type: 'percent',
      rules: ['required', 'value_between_0_and_1', 'blur_normalizes_values_above_1'],
    },
    {
      path: 'lms_settings.enabled',
      label: 'planning.study-plans.fields.lms-enabled',
      type: 'boolean',
      rules: ['controls_lms_scale_fields'],
    },
    {
      path: 'lms_settings.skills_scale_id',
      label: 'planning.study-plans.fields.skills-scale',
      type: 'catalog',
      catalogKey: 'skill_scales',
      rules: ['nullable', 'disabled_and_null_when_lms_disabled'],
    },
    {
      path: 'lms_settings.performance_scale_id',
      label: 'planning.study-plans.fields.performance-scale',
      type: 'catalog',
      catalogKey: 'performance_scales',
      rules: ['nullable', 'disabled_and_null_when_lms_disabled'],
    },
  ];

  protected readonly form = this.fb.group({
    study_plan: this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(70)]],
      description: ['', [Validators.maxLength(150)]],
      start: ['', Validators.required],
      end: ['', Validators.required],
      level_id: [null as number | null, Validators.required],
      school_year_id: [null as number | null, Validators.required],
      section_id: [null as number | null, Validators.required],
      study_plan_structure_id: [null as number | null, Validators.required],
      schedule_type_id: [null as number | null, Validators.required],
    }),
    grading_settings: this.fb.group({
      grading_scale_id: [null as number | null, Validators.required],
      grade_policy_id: [null as number | null, Validators.required],
      aspect_mode_id: [null as number | null, Validators.required],
      comment_type_id: [null as number | null, Validators.required],
      decimals: [0, [Validators.required, Validators.min(0)]],
      class_percent: [
        null as number | null,
        [Validators.required, Validators.min(0), Validators.max(1)],
      ],
      exam_percent: [
        null as number | null,
        [Validators.required, Validators.min(0), Validators.max(1)],
      ],
      exemptions: [false],
      exemption_average: [null as number | null],
      exemption_percent: [null as number | null, [Validators.min(0), Validators.max(1)]],
    }),
    attendance_settings: this.fb.group({
      attendance_type_id: [null as number | null, Validators.required],
      attendance_calculation_id: [null as number | null, Validators.required],
      attendance_details: [true],
      delay_absence_ratio: [0, [Validators.required, Validators.min(0)]],
      attendance_delay: [0, [Validators.required, Validators.min(0)]],
      attendance_percent: [
        null as number | null,
        [Validators.required, Validators.min(0), Validators.max(1)],
      ],
    }),
    lms_settings: this.fb.group({
      enabled: [false],
      skills_scale_id: [null as number | null],
      performance_scale_id: [null as number | null],
    }),
  });

  protected readonly planId = computed(() => {
    const selectedStudyPlanId = this.selectedStudyPlanId();

    if (selectedStudyPlanId) {
      return selectedStudyPlanId;
    }

    const value = this.activatedRoute.snapshot.paramMap.get('planId');

    return value ? Number(value) : null;
  });

  ngOnInit(): void {
    this.initRouteMeta();
    this.watchLmsEnabled();
    this.loadStudyPlan();
    this.watchActiveSection();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedStudyPlanId'] && this.selectedStudyPlanId()) {
      this.loadStudyPlan();
    }
  }

  private loadStudyPlan(): void {
    const route = this.apiRoute();
    const planId = this.planId();

    if (!route || !planId) {
      return;
    }

    this.executeSilentRequest<StudyPlanConfigurationData>(
      this.api.get(`${route}/${planId}`),
      (res) => {
        const catalogs = res.data?.catalogs ?? {};
        const studyPlan = this.normalizeStudyPlan(res.data?.['study-plan'] ?? null, catalogs);

        this.catalogs.set(catalogs);
        this.studyPlan.set(studyPlan);

        if (res.data?.children) {
          this.setScreenChildren(
            res.data.children.filter((child) => child.name !== 'study-plan-information'),
          );
        }

        if (res.data?.options) {
          this.setScreenOptions(res.data.options);
        }

        this.setStudyPlanConfigurationContext(studyPlan);
      },
    );
  }

  private normalizeStudyPlan(
    studyPlan: StudyPlanConfigurationItem | null,
    catalogs: StudyPlanConfigurationCatalogs,
  ): StudyPlanConfigurationItem | null {
    if (!studyPlan) {
      return null;
    }

    return {
      ...studyPlan,
      structure:
        studyPlan.structure ??
        catalogs.study_plan_structures?.find(
          (structure) => structure.id === studyPlan.study_plan_structure_id,
        ) ??
        null,
      schedule_type:
        studyPlan.schedule_type ??
        catalogs.schedule_types?.find(
          (scheduleType) => scheduleType.id === studyPlan.schedule_type_id,
        ) ??
        null,
    };
  }

  private watchActiveSection(): void {
    this.activatedRoute.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.activeSection.set(params.get('section'));
        this.setStudyPlanConfigurationContext(this.studyPlan());
      });
  }

  private watchLmsEnabled(): void {
    this.form.controls.lms_settings.controls.enabled.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((enabled) => {
        this.applyLmsEnabledState(Boolean(enabled), true);
      });
  }

  private applyLmsEnabledState(enabled: boolean, refreshAssistantContext = false): void {
    const lmsSettings = this.form.controls.lms_settings.controls;
    const options = { emitEvent: false };

    if (enabled) {
      lmsSettings.skills_scale_id.enable(options);
      lmsSettings.performance_scale_id.enable(options);
      this.refreshEditingAssistantContext(refreshAssistantContext);
      return;
    }

    lmsSettings.skills_scale_id.reset(null, options);
    lmsSettings.performance_scale_id.reset(null, options);
    lmsSettings.skills_scale_id.disable(options);
    lmsSettings.performance_scale_id.disable(options);
    this.refreshEditingAssistantContext(refreshAssistantContext);
  }

  private setStudyPlanConfigurationContext(studyPlan: StudyPlanConfigurationItem | null): void {
    const activeSection = this.activeSection();
    const embedded = Boolean(this.selectedStudyPlanId());
    const editMode = this.editMode();
    const hasActiveSection = activeSection !== null;
    const sectionContextId = hasActiveSection
      ? this.getAssistantContextId(activeSection)
      : 'planning.study-plans.configuration';
    const sectionTitle = hasActiveSection
      ? this.getAssistantSectionTitle(activeSection)
      : 'Configuración del plan';
    const contextType = editMode ? 'editor' : embedded ? 'selection' : 'section';
    const contextId = embedded ? 'planning.study-plans' : sectionContextId;
    const mode = editMode ? 'editing' : embedded ? 'selected' : (activeSection ?? 'configuration');
    const editingContext = editMode
      ? {
          editingSummary: {
            invalid: this.form.invalid,
            dirty: this.form.dirty,
            touched: this.form.touched,
          },
          editingFields: this.getAssistantEditingFields(),
        }
      : {};

    this.setAssistantContext({
      contextType,
      contextId,
      feature: 'study-plans',
      title: embedded ? (studyPlan?.name ?? 'Plan de estudios') : sectionTitle,
      subtitle: embedded
        ? 'planning.study-plans.messages.selected-plan'
        : (studyPlan?.name ?? 'Configuración del plan'),
      entity: 'StudyPlan',
      mode,
      data: {
        ...(studyPlan && {
          studyPlanId: studyPlan.id,
          studyPlanName: studyPlan.name,
          levelId: studyPlan.level_id,
          levelName: studyPlan.level?.name ?? null,
          schoolYearId: studyPlan.school_year_id,
          schoolYearName: studyPlan.school_year?.name ?? null,
          sectionId: studyPlan.section_id,
          sectionName: studyPlan.section?.name ?? null,
          ...(!embedded && hasActiveSection
            ? {
                activeSection,
                sectionTitle,
              }
            : {}),
        }),
        hasSelection: Boolean(studyPlan),
        selectedStudyPlanId: studyPlan?.id ?? null,
        embedded,
        editMode,
        ...editingContext,
        availableChildren: this.getAssistantAvailableChildren(),
        availableOptions: this.getAssistantAvailableOptions(),
      },
    });
  }

  private getAssistantEditingFields(): AssistantEditingFieldContext[] {
    return this.assistantEditingFieldDefinitions.flatMap((definition) => {
      const control = this.form.get(definition.path);

      if (!control) {
        return [];
      }

      const baseField: AssistantEditingFieldContext = {
        path: definition.path,
        label: definition.label,
        type: definition.type,
        value: control.value,
        disabled: control.disabled,
        valid: control.valid,
        touched: control.touched,
        dirty: control.dirty,
        errors: control.errors,
        ...(definition.rules ? { rules: definition.rules } : {}),
      };

      if (!definition.catalogKey) {
        return [baseField];
      }

      const availableOptions = this.getAssistantCatalogOptions(definition.catalogKey);

      return [
        {
          ...baseField,
          catalogKey: definition.catalogKey,
          selectedOption: availableOptions.find((option) => option.id === control.value) ?? null,
          availableOptions,
        },
      ];
    });
  }

  private getAssistantCatalogOptions(
    catalogKey: StudyPlanConfigurationCatalogKey,
  ): AssistantCatalogOption[] {
    const catalogs = this.catalogs();

    switch (catalogKey) {
      case 'levels':
        return this.enrichAssistantCatalogOptions(catalogs.levels ?? []);
      case 'school_years':
        return this.enrichAssistantCatalogOptions(catalogs.school_years ?? []);
      case 'sections':
        return this.enrichAssistantCatalogOptions(catalogs.sections ?? []);
      case 'study_plan_structures':
        return this.enrichAssistantCatalogOptions(catalogs.study_plan_structures ?? []);
      case 'schedule_types':
        return this.enrichAssistantCatalogOptions(catalogs.schedule_types ?? []);
      case 'grading_scales':
        return this.enrichAssistantCatalogOptions(catalogs.grading_scales ?? []);
      case 'grade_policies':
        return this.enrichAssistantCatalogOptions(catalogs.grade_policies ?? []);
      case 'aspect_modes':
        return this.enrichAssistantCatalogOptions(catalogs.aspect_modes ?? []);
      case 'comment_types':
        return this.enrichAssistantCatalogOptions(catalogs.comment_types ?? []);
      case 'attendance_types':
        return this.enrichAssistantCatalogOptions(catalogs.attendance_types ?? []);
      case 'attendance_calculations':
        return this.enrichAssistantCatalogOptions(catalogs.attendance_calculations ?? []);
      case 'skill_scales':
        return this.enrichAssistantCatalogOptions(catalogs.skill_scales ?? []);
      case 'performance_scales':
        return this.enrichAssistantCatalogOptions(catalogs.performance_scales ?? []);
    }
  }

  private enrichAssistantCatalogOptions(
    options: StudyPlanConfigurationCatalogItem[],
  ): AssistantCatalogOption[] {
    return options.map((option) => this.enrichAssistantCatalogOption(option));
  }

  private enrichAssistantCatalogOption(
    option: StudyPlanConfigurationCatalogItem,
  ): AssistantCatalogOption {
    const helpTranslation = this.getAssistantCatalogHelpTranslation(option);

    return {
      ...option,
      ...(option.translation
        ? {
            translatedLabel: this.translate.instant(option.translation),
          }
        : {}),
      ...(helpTranslation
        ? {
            helpText: this.translate.instant(helpTranslation),
          }
        : {}),
    };
  }

  private getAssistantCatalogHelpTranslation(
    option: StudyPlanConfigurationCatalogItem,
  ): string | null {
    if (!('help_translation' in option)) {
      return null;
    }

    return option.help_translation ?? null;
  }

  private getAssistantContextId(section: string): string {
    const map: Record<string, string> = {
      'study-plan-academics': 'planning.study-plans.academics',
      'study-plan-organizations': 'planning.study-plans.scheduling',
      'study-plan-evaluation': 'planning.study-plans.evaluation',
      'study-plan-report-cards': 'planning.study-plans.report-cards',
    };

    return map[section] ?? 'planning.study-plans.configuration';
  }

  private getAssistantSectionTitle(section: string): string {
    const map: Record<string, string> = {
      'study-plan-academics': 'Estructura académica',
      'study-plan-organizations': 'Horarios y calendario',
      'study-plan-evaluation': 'Evaluación',
      'study-plan-report-cards': 'Boletas',
    };

    return map[section] ?? 'Configuración del plan';
  }

  protected enterEditMode(): void {
    const studyPlan = this.studyPlan();

    if (!studyPlan) {
      return;
    }

    this.patchForm(studyPlan);
    this.editMode.set(true);
    this.setStudyPlanConfigurationContext(studyPlan);
  }

  protected cancelEditMode(): void {
    this.form.reset();
    this.editMode.set(false);
    this.setStudyPlanConfigurationContext(this.studyPlan());
  }

  protected save(): void {
    const studyPlan = this.studyPlan();
    const route = this.apiRoute();

    if (!studyPlan || !route) {
      return;
    }

    this.normalizePercentControls();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.refreshEditingAssistantContext(true);
      return;
    }

    const payload = this.buildUpdatePayload();

    if (this.hasStructureChanged(studyPlan, payload)) {
      this.validateAndConfirmRestructure(route, studyPlan.id, payload);
      return;
    }

    this.executeStudyPlanUpdate(route, studyPlan.id, payload);
  }

  private validateAndConfirmRestructure(
    route: string,
    studyPlanId: number,
    payload: StudyPlanUpdatePayload,
  ): void {
    this.executeSilentRequest<StudyPlanRestructureValidationData>(
      this.api.post(`${route}/${studyPlanId}/validate-restructure`, {
        study_plan_structure_id: payload.study_plan.study_plan_structure_id,
        start: payload.study_plan.start,
        end: payload.study_plan.end,
      }),
      async (res) => {
        if (!res.data.viable || !res.data.requires_confirmation) {
          return;
        }

        const confirmed = await this.confirmRestructure();

        if (!confirmed) {
          return;
        }

        this.executeStudyPlanUpdate(route, studyPlanId, payload);
      },
    );
  }

  private async confirmRestructure(): Promise<boolean> {
    const confirmed = await this.modal.open<ISklConfirmModalData, boolean>({
      component: SklConfirmModal,
      title: this.translate.instant('planning.study-plans.messages.confirm-restructure-title'),
      data: {
        message: this.translate.instant('planning.study-plans.messages.confirm-restructure'),
        confirmLabel: this.translate.instant('common.save'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'warning',
      },
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    return confirmed === true;
  }

  private executeStudyPlanUpdate(
    route: string,
    studyPlanId: number,
    payload: StudyPlanUpdatePayload,
  ): void {
    this.executeMutationRequest<StudyPlanUpdateData>(
      this.api.put(`${route}/${studyPlanId}`, payload),
      (res) => {
        const updated = this.normalizeStudyPlan(res.data['study-plan'] ?? null, this.catalogs());

        if (!updated) {
          this.loadStudyPlan();
          return;
        }

        this.studyPlan.set(updated);
        this.patchForm(updated);
        this.editMode.set(false);
        this.studyPlanUpdated.emit(updated);
        this.setStudyPlanConfigurationContext(updated);

        if (res.data.restructured && this.activeSection() === 'study-plan-academics') {
          this.academicsRefreshToken.update((value) => value + 1);
        }
      },
    );
  }

  private hasStructureChanged(
    studyPlan: StudyPlanConfigurationItem,
    payload: StudyPlanUpdatePayload,
  ): boolean {
    return studyPlan.study_plan_structure_id !== payload.study_plan.study_plan_structure_id;
  }

  private buildUpdatePayload(): StudyPlanUpdatePayload {
    const value = this.form.getRawValue();
    const studyPlan = value.study_plan;
    const gradingSettings = value.grading_settings;
    const attendanceSettings = value.attendance_settings;
    const lmsSettings = value.lms_settings;

    return {
      study_plan: {
        name: studyPlan.name?.trim() ?? '',
        description: this.nullableTrim(studyPlan.description),
        start: studyPlan.start ?? '',
        end: studyPlan.end ?? '',
        level_id: Number(studyPlan.level_id),
        school_year_id: Number(studyPlan.school_year_id),
        section_id: Number(studyPlan.section_id),
        study_plan_structure_id: Number(studyPlan.study_plan_structure_id),
        schedule_type_id: Number(studyPlan.schedule_type_id),
      },
      grading_settings: {
        grading_scale_id: Number(gradingSettings.grading_scale_id),
        grade_policy_id: Number(gradingSettings.grade_policy_id),
        aspect_mode_id: Number(gradingSettings.aspect_mode_id),
        comment_type_id: Number(gradingSettings.comment_type_id),
        decimals: Number(gradingSettings.decimals),
        class_percent: this.toNumber(gradingSettings.class_percent, 0),
        exam_percent: this.toNumber(gradingSettings.exam_percent, 0),
        exemptions: Boolean(gradingSettings.exemptions),
        exemption_average: this.toNumberOrNull(gradingSettings.exemption_average),
        exemption_percent: this.toNumberOrNull(gradingSettings.exemption_percent),
      },
      attendance_settings: {
        attendance_type_id: Number(attendanceSettings.attendance_type_id),
        attendance_calculation_id: Number(attendanceSettings.attendance_calculation_id),
        attendance_details: Boolean(attendanceSettings.attendance_details),
        delay_absence_ratio: Number(attendanceSettings.delay_absence_ratio),
        attendance_delay: Number(attendanceSettings.attendance_delay),
        attendance_percent: this.toNumber(attendanceSettings.attendance_percent, 0),
      },
      lms_settings: {
        enabled: Boolean(lmsSettings.enabled),
        skills_scale_id: lmsSettings.enabled
          ? this.toNumberOrNull(lmsSettings.skills_scale_id)
          : null,
        performance_scale_id: lmsSettings.enabled
          ? this.toNumberOrNull(lmsSettings.performance_scale_id)
          : null,
      },
    };
  }

  private patchForm(studyPlan: StudyPlanConfigurationItem): void {
    const gradingSettings = studyPlan.grading_settings;
    const attendanceSettings = studyPlan.attendance_settings;
    const lmsSettings = studyPlan.lms_settings;

    this.form.patchValue(
      {
        study_plan: {
          name: studyPlan.name,
          description: studyPlan.description ?? '',
          start: studyPlan.start,
          end: studyPlan.end,
          level_id: studyPlan.level_id,
          school_year_id: studyPlan.school_year_id,
          section_id: studyPlan.section_id,
          study_plan_structure_id: studyPlan.study_plan_structure_id,
          schedule_type_id: studyPlan.schedule_type_id,
        },
        grading_settings: {
          grading_scale_id: gradingSettings?.grading_scale_id ?? null,
          grade_policy_id: gradingSettings?.grade_policy_id ?? null,
          aspect_mode_id: gradingSettings?.aspect_mode_id ?? null,
          comment_type_id: gradingSettings?.comment_type_id ?? null,
          decimals: gradingSettings?.decimals ?? 0,
          class_percent: this.toNumber(gradingSettings?.class_percent, 0),
          exam_percent: this.toNumber(gradingSettings?.exam_percent, 0),
          exemptions: gradingSettings?.exemptions ?? false,
          exemption_average: this.toNumberOrNull(gradingSettings?.exemption_average),
          exemption_percent: this.toNumberOrNull(gradingSettings?.exemption_percent),
        },
        attendance_settings: {
          attendance_type_id: attendanceSettings?.attendance_type_id ?? null,
          attendance_calculation_id: attendanceSettings?.attendance_calculation_id ?? null,
          attendance_details: attendanceSettings?.attendance_details ?? true,
          delay_absence_ratio: attendanceSettings?.delay_absence_ratio ?? 0,
          attendance_delay: attendanceSettings?.attendance_delay ?? 0,
          attendance_percent: this.toNumber(attendanceSettings?.attendance_percent, 0),
        },
        lms_settings: {
          enabled: lmsSettings?.enabled ?? false,
          skills_scale_id: lmsSettings?.skills_scale_id ?? null,
          performance_scale_id: lmsSettings?.performance_scale_id ?? null,
        },
      },
      { emitEvent: false },
    );

    this.applyLmsEnabledState(Boolean(lmsSettings?.enabled));
  }

  protected normalizePercentControl(path: string): void {
    const control = this.form.get(path);

    if (!control) {
      return;
    }

    control.setValue(this.normalizePercentValue(control.value));
    control.markAsTouched();
    control.updateValueAndValidity();
    this.refreshEditingAssistantContext(true);
  }

  private refreshEditingAssistantContext(refreshAssistantContext: boolean): void {
    if (!refreshAssistantContext || !this.editMode()) {
      return;
    }

    this.setStudyPlanConfigurationContext(this.studyPlan());
  }

  private normalizePercentControls(): void {
    [
      'grading_settings.class_percent',
      'grading_settings.exam_percent',
      'grading_settings.exemption_percent',
      'attendance_settings.attendance_percent',
    ].forEach((path) => this.normalizePercentControl(path));
  }

  private normalizePercentValue(value: string | number | null | undefined): number | null {
    const numberValue = this.toNumberOrNull(value);

    if (numberValue === null) {
      return null;
    }

    const normalizedValue = numberValue > 1 ? numberValue / 100 : numberValue;

    return Number(normalizedValue.toFixed(4));
  }

  private toNumber(value: string | number | null | undefined, fallback: number): number {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    const numberValue = Number(value);

    return Number.isNaN(numberValue) ? fallback : numberValue;
  }

  private toNumberOrNull(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numberValue = Number(value);

    return Number.isNaN(numberValue) ? null : numberValue;
  }

  private nullableTrim(value: string | null | undefined): string | null {
    const trimmed = value?.trim() ?? '';

    return trimmed.length > 0 ? trimmed : null;
  }

  protected goBack(): void {
    this.router.navigate(['../'], {
      relativeTo: this.activatedRoute,
    });
  }

  protected selectStudyPlanChild(child: ScreenChildItem): void {
    const studyPlan = this.studyPlan();

    if (!studyPlan) {
      return;
    }

    if (this.selectedStudyPlanId()) {
      this.studyPlanChildSelected.emit({ child, studyPlan });
      return;
    }

    this.changeSection(child.name);
  }

  protected async requestDeleteStudyPlan(): Promise<void> {
    if (this.selectedStudyPlanId()) {
      this.studyPlanDeleteRequested.emit();
      return;
    }

    const studyPlan = this.studyPlan();
    const route = this.apiRoute();

    if (!studyPlan || !route) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'planning.study-plans.delete',
      'planning.study-plans.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.executeMutationRequest<null>(this.api.delete(`${route}/${studyPlan.id}`), () => {
      this.studyPlan.set(null);
      this.goBack();
    });
  }

  protected changeSection(section: string): void {
    if (!section || this.activeSection() === section) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { section },
      queryParamsHandling: 'merge',
    });
  }

  protected getStudyPlanChildDescription(name: string): string {
    const map: Record<string, string> = {
      'study-plan-academics': 'planning.study-plans.children.academics',
      'study-plan-organizations': 'planning.study-plans.children.scheduling',
      'study-plan-evaluation': 'planning.study-plans.children.evaluation',
      'study-plan-report-cards': 'planning.study-plans.children.report-cards',
    };

    return map[name] ?? '';
  }

  protected childRoute(name: string): string | null {
    const baseRoute = this.apiRoute();
    const studyPlanId = this.studyPlan()?.id;

    if (!baseRoute || !studyPlanId) {
      return null;
    }

    const segments = baseRoute.split('/');

    segments.pop();
    segments.push(name);
    segments.push(String(studyPlanId));

    return segments.join('/');
  }
}
