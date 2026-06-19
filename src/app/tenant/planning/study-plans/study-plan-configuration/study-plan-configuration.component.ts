import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { ScreenChildItem, ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';
import { StudyPlanAcademicsComponent } from '../study-plan-academics/study-plan-academics.component';

export interface StudyPlanConfigurationItem {
  id: number;
  name: string;
  description: string | null;
  start: string;
  end: string;
  level_id: number;
  school_year_id: number;
  section_id: number;
  studyplan_structure_id: number;
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
  studyplan_structures?: StudyPlanConfigurationStructureCatalogItem[];
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

@Component({
  selector: 'app-study-plan-configuration',
  imports: [
    UiButtonComponent,
    UiIconComponent,
    TranslatePipe,
    DatePipe,
    ReactiveFormsModule,
    StudyPlanAcademicsComponent,
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

  protected readonly studyPlan = signal<StudyPlanConfigurationItem | null>(null);
  protected readonly catalogs = signal<StudyPlanConfigurationCatalogs>({});
  protected readonly activeSection = signal<string | null>(null);

  protected readonly editMode = signal<boolean>(false);

  protected readonly form = this.fb.group({
    study_plan: this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(70)]],
      description: ['', [Validators.maxLength(150)]],
      start: ['', Validators.required],
      end: ['', Validators.required],
      level_id: [null as number | null, Validators.required],
      school_year_id: [null as number | null, Validators.required],
      section_id: [null as number | null, Validators.required],
      studyplan_structure_id: [null as number | null, Validators.required],
      schedule_type_id: [null as number | null, Validators.required],
    }),
    grading_settings: this.fb.group({
      grading_scale_id: [null as number | null, Validators.required],
      grade_policy_id: [null as number | null, Validators.required],
      aspect_mode_id: [null as number | null, Validators.required],
      comment_type_id: [null as number | null, Validators.required],
      decimals: [0, [Validators.required, Validators.min(0)]],
      class_percent: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      exam_percent: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      exemptions: [false],
      exemption_average: [null as number | null],
      exemption_percent: [null as number | null],
    }),
    attendance_settings: this.fb.group({
      attendance_type_id: [null as number | null, Validators.required],
      attendance_calculation_id: [null as number | null, Validators.required],
      attendance_details: [true],
      delay_absence_ratio: [0, [Validators.required, Validators.min(0)]],
      attendance_delay: [0, [Validators.required, Validators.min(0)]],
      attendance_percent: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
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
        catalogs.studyplan_structures?.find(
          (structure) => structure.id === studyPlan.studyplan_structure_id,
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
        availableChildren: this.getAssistantAvailableChildren(),
        availableOptions: this.getAssistantAvailableOptions(),
      },
    });
  }

  private getAssistantContextId(section: string): string {
    const map: Record<string, string> = {
      'study-plan-information': 'planning.study-plans.information',
      'study-plan-academics': 'planning.study-plans.academics',
      'study-plan-scheduling': 'planning.study-plans.scheduling',
      'study-plan-evaluation': 'planning.study-plans.evaluation',
      'study-plan-report-cards': 'planning.study-plans.report-cards',
    };

    return map[section] ?? 'planning.study-plans.configuration';
  }

  private getAssistantSectionTitle(section: string): string {
    const map: Record<string, string> = {
      'study-plan-information': 'Información del plan',
      'study-plan-academics': 'Estructura académica',
      'study-plan-scheduling': 'Horarios y calendario',
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

  private patchForm(studyPlan: StudyPlanConfigurationItem): void {
    const gradingSettings = studyPlan.grading_settings;
    const attendanceSettings = studyPlan.attendance_settings;
    const lmsSettings = studyPlan.lms_settings;

    this.form.patchValue({
      study_plan: {
        name: studyPlan.name,
        description: studyPlan.description ?? '',
        start: studyPlan.start,
        end: studyPlan.end,
        level_id: studyPlan.level_id,
        school_year_id: studyPlan.school_year_id,
        section_id: studyPlan.section_id,
        studyplan_structure_id: studyPlan.studyplan_structure_id,
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
    });
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
      'study-plan-information': 'planning.study-plans.children.information',
      'study-plan-academics': 'planning.study-plans.children.academics',
      'study-plan-scheduling': 'planning.study-plans.children.scheduling',
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
