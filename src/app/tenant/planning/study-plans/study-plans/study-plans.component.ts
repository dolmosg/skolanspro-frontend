import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { ScreenOptionItem, ScreenChildItem } from '@shared/interfaces/access.interfaces';
import type { ISchoolYear, ISection } from '@shared/interfaces/administration.interfaces';
import type {
  ILevel,
  IScheduleType,
  IStudyPlanStructure,
} from '@shared/interfaces/configuration.interfaces';
import type { IStudyPlan } from '@shared/interfaces/study-plan-interfaces';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';
import { Router } from '@angular/router';
import {
  StudyPlanConfigurationComponent,
  type StudyPlanConfigurationItem,
} from '../study-plan-configuration/study-plan-configuration.component';

export interface StudyPlanListItem extends Omit<
  IStudyPlan,
  'stages' | 'grading_settings' | 'attendance_settings' | 'lms_settings'
> {}

export interface StudyPlansCatalogs {
  levels: ILevel[];
  school_years: ISchoolYear[];
  sections: ISection[];
  study_plan_structures: IStudyPlanStructure[];
  schedule_types: IScheduleType[];
}

export interface StudyPlansIndexData {
  'study-plans'?: StudyPlanListItem[];
  options?: ScreenOptionItem[];
  children?: ScreenChildItem[];
  catalogs?: Partial<StudyPlansCatalogs>;
}

type StudyPlanCreatePayload = Pick<
  IStudyPlan,
  | 'name'
  | 'description'
  | 'start'
  | 'end'
  | 'level_id'
  | 'school_year_id'
  | 'section_id'
  | 'study_plan_structure_id'
  | 'schedule_type_id'
>;

@Component({
  selector: 'app-study-plans',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    SkSelectComponent,
    UiButtonComponent,
    UiIconComponent,
    DatePipe,
    StudyPlanConfigurationComponent,
  ],
  templateUrl: './study-plans.component.html',
  styleUrl: './study-plans.component.scss',
})
export class StudyPlansComponent extends SkolansBaseComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  protected readonly studyPlans = signal<StudyPlanListItem[]>([]);
  protected readonly selectedStudyPlan = signal<StudyPlanListItem | null>(null);
  protected readonly isCreatingStudyPlan = signal(false);

  protected readonly catalogs = signal<StudyPlansCatalogs>({
    levels: [],
    school_years: [],
    sections: [],
    study_plan_structures: [],
    schedule_types: [],
  });

  protected readonly sectionControl = new FormControl<number | null>(null);
  protected readonly schoolYearControl = new FormControl<number | null>(null);

  protected readonly createStudyPlanForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(70)]],
    description: ['', [Validators.maxLength(150)]],
    start: ['', [Validators.required]],
    end: ['', [Validators.required]],
    level_id: [null as number | null, [Validators.required]],
    school_year_id: [null as number | null, [Validators.required]],
    section_id: [null as number | null, [Validators.required]],
    study_plan_structure_id: [null as number | null, [Validators.required]],
    schedule_type_id: [null as number | null, [Validators.required]],
  });

  protected readonly selectedSectionId = signal<number | null>(null);
  protected readonly selectedSchoolYearId = signal<number | null>(null);

  /* =====================================================
   * 🔥 CHILDREN (nuevo)
   * ===================================================== */

  protected readonly hasSelectedPlan = computed(() => !!this.selectedStudyPlan());

  protected readonly studyPlanGroups = [
    {
      key: 'academics',
      controllers: ['study-plan-academics'],
    },
    {
      key: 'scheduling',
      controllers: ['study-plan-scheduling'],
    },
    {
      key: 'evaluation',
      controllers: ['study-plan-evaluation'],
    },
    {
      key: 'report-cards',
      controllers: ['study-plan-report-cards'],
    },
  ];

  protected getChildrenByGroup(groupKey: string): ScreenChildItem[] {
    const group = this.studyPlanGroups.find((g) => g.key === groupKey);

    if (!group) return [];

    return this.children().filter((child) => group.controllers.includes(child.name));
  }

  /* ===================================================== */

  protected readonly filteredStudyPlans = computed(() => {
    const sectionId = this.selectedSectionId();
    const schoolYearId = this.selectedSchoolYearId();

    return this.studyPlans().filter((studyPlan) => {
      const matchesSection = !sectionId || studyPlan.section_id === sectionId;
      const matchesSchoolYear = !schoolYearId || studyPlan.school_year_id === schoolYearId;

      return matchesSection && matchesSchoolYear;
    });
  });

  protected readonly hasStudyPlans = computed(() => this.filteredStudyPlans().length > 0);

  protected readonly availableLevelsForCreate = computed(() => {
    const usedLevelIds = new Set(this.filteredStudyPlans().map((studyPlan) => studyPlan.level_id));

    return this.catalogs().levels.filter((level) => !usedLevelIds.has(level.id));
  });

  protected readonly canCreateStudyPlan = computed(
    () =>
      !!this.selectedSectionId() &&
      !!this.selectedSchoolYearId() &&
      this.availableLevelsForCreate().length > 0,
  );

  ngOnInit(): void {
    this.initRouteMeta();
    this.setStudyPlansListContext();
    this.watchFilters();
    this.reloadStudyPlans();
  }

  protected reloadStudyPlans(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest<StudyPlansIndexData>(this.api.get(route), (res) => {
      this.studyPlans.set(res.data?.['study-plans'] ?? []);
      this.setScreenOptions(res.data?.options);
      this.setScreenChildren(res.data?.children);

      this.catalogs.set({
        levels: (res.data?.catalogs?.levels ?? []).map((item) => this.mapLevelLabel(item)),
        school_years: res.data?.catalogs?.school_years ?? [],
        sections: (res.data?.catalogs?.sections ?? []).map((item) => this.mapCatalogLabel(item)),
        study_plan_structures: (res.data?.catalogs?.study_plan_structures ?? []).map((item) =>
          this.mapCatalogLabel(item),
        ),
        schedule_types: (res.data?.catalogs?.schedule_types ?? []).map((item) =>
          this.mapCatalogLabel(item),
        ),
      });

      this.applyDefaultFilters();
      this.selectedStudyPlan.set(null);
      this.setStudyPlansListContext();
    });
  }

  protected selectStudyPlan(studyPlan: StudyPlanListItem): void {
    this.resetCreateStudyPlanForm();
    this.isCreatingStudyPlan.set(false);
    this.selectedStudyPlan.set(studyPlan);
    this.setSelectedStudyPlanContext(studyPlan);
  }

  protected clearSelectedStudyPlan(): void {
    this.selectedStudyPlan.set(null);
    this.assistantContext.clearFromLevel('selection');
  }

  private watchFilters(): void {
    this.sectionControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((sectionId) => {
        this.selectedSectionId.set(sectionId);
        this.resetCreateStudyPlanForm();
        this.isCreatingStudyPlan.set(false);
        this.selectedStudyPlan.set(null);
        this.setStudyPlansListContext();
      });

    this.schoolYearControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((schoolYearId) => {
        this.selectedSchoolYearId.set(schoolYearId);
        this.resetCreateStudyPlanForm();
        this.isCreatingStudyPlan.set(false);
        this.selectedStudyPlan.set(null);
        this.setStudyPlansListContext();
      });
  }

  private applyDefaultFilters(): void {
    const sections = this.catalogs().sections;
    const schoolYears = this.catalogs().school_years;

    if (sections.length === 1) {
      this.sectionControl.setValue(sections[0].id);
    }

    const currentSchoolYear = schoolYears.find((schoolYear) => schoolYear.current);

    if (currentSchoolYear) {
      this.schoolYearControl.setValue(currentSchoolYear.id);
    }
  }

  private setStudyPlansListContext(): void {
    const sectionId = this.selectedSectionId();
    const schoolYearId = this.selectedSchoolYearId();

    this.setAssistantContext({
      contextType: 'route',
      contextId: 'planning.study-plans',
      feature: 'study-plans',
      title: 'planning.study-plans.title',
      subtitle: 'planning.study-plans.description',
      entity: 'StudyPlan',
      mode: 'list',
      data: {
        sectionId,
        sectionName: sectionId ? this.findCatalogLabel(this.catalogs().sections, sectionId) : null,
        schoolYearId,
        schoolYearName: schoolYearId
          ? this.findCatalogLabel(this.catalogs().school_years, schoolYearId)
          : null,
        totalStudyPlans: this.studyPlans().length,
        filteredStudyPlans: this.filteredStudyPlans().length,
        canCreateStudyPlan: this.canCreateStudyPlan(),
        isCreatingStudyPlan: this.isCreatingStudyPlan(),
        hasSelection: false,
        selectedStudyPlanId: null,
        availableChildren: this.getAssistantAvailableChildren(),
        availableOptions: this.getAssistantAvailableOptions(),
      },
    });
  }

  private setSelectedStudyPlanContext(studyPlan: StudyPlanListItem): void {
    this.setAssistantContext({
      contextType: 'selection',
      contextId: 'planning.study-plans',
      feature: 'study-plans',
      title: studyPlan.name,
      subtitle: 'planning.study-plans.messages.selected-plan',
      entity: 'StudyPlan',
      mode: 'selected',
      data: {
        studyPlanId: studyPlan.id,
        studyPlanName: studyPlan.name,
        studyPlanDescription: studyPlan.description ?? null,
        start: studyPlan.start,
        end: studyPlan.end,
        levelId: studyPlan.level_id,
        levelName: this.getLevelName(studyPlan),
        schoolYearId: studyPlan.school_year_id,
        schoolYearName: this.getSchoolYearName(studyPlan),
        sectionId: studyPlan.section_id,
        sectionName: this.getSectionName(studyPlan),
        hasSelection: true,
        selectedStudyPlanId: studyPlan.id,
        studyPlanStructureId: studyPlan.study_plan_structure_id,
        studyPlanStructureName: this.getStructureName(studyPlan),
        scheduleTypeId: studyPlan.schedule_type_id,
        scheduleTypeName: this.getScheduleTypeName(studyPlan),
        availableChildren: this.getAssistantAvailableChildren(),
        availableOptions: this.getAssistantAvailableOptions(),
      },
    });
  }

  private mapCatalogLabel<T extends { name: string | null; translation?: string | null }>(
    item: T,
  ): T & { label: string | null } {
    return {
      ...item,
      label: item.translation || item.name,
    };
  }

  private mapLevelLabel<T extends { name: string | null; description?: string | null }>(
    item: T,
  ): T & { label: string | null } {
    return {
      ...item,
      label: item.description || item.name,
    };
  }

  protected getLevelName(studyPlan: StudyPlanListItem): string {
    return this.findCatalogLabel(this.catalogs().levels, studyPlan.level_id);
  }

  protected getSectionName(studyPlan: StudyPlanListItem): string {
    const section = this.catalogs().sections.find((item) => item.id === studyPlan.section_id);
    return section?.description || section?.name || '-';
  }

  protected getSchoolYearName(studyPlan: StudyPlanListItem): string {
    const schoolYear = this.catalogs().school_years.find(
      (item) => item.id === studyPlan.school_year_id,
    );

    return schoolYear?.name || '-';
  }

  protected getStructureName(studyPlan: StudyPlanListItem): string {
    return this.findCatalogLabel(
      this.catalogs().study_plan_structures,
      studyPlan.study_plan_structure_id,
    );
  }

  protected getScheduleTypeName(studyPlan: StudyPlanListItem): string {
    return this.findCatalogLabel(this.catalogs().schedule_types, studyPlan.schedule_type_id);
  }

  protected findCatalogLabel(
    items: Array<{
      id: number;
      name: string | null;
      description?: string | null;
      translation?: string | null;
    }>,
    id: number,
  ): string {
    const item = items.find((catalogItem) => catalogItem.id === id);
    return item?.translation || item?.description || item?.name || '-';
  }

  protected openStudyPlanChild(child: ScreenChildItem, plan: { id: number } | null): void {
    if (!plan?.id || !child?.name) {
      return;
    }

    this.router.navigate([plan.id], {
      relativeTo: this.activatedRoute,
      queryParams: {
        section: child.name,
      },
    });
  }

  protected onStudyPlanUpdated(studyPlan: StudyPlanConfigurationItem): void {
    const existing = this.studyPlans().find((item) => item.id === studyPlan.id);

    if (!existing) {
      return;
    }

    const reconciled = this.reconcileUpdatedStudyPlan(existing, studyPlan);

    this.studyPlans.update((current) =>
      this.sortStudyPlansForList(
        current.map((item) => (item.id === reconciled.id ? reconciled : item)),
      ),
    );
    this.selectedStudyPlan.set(reconciled);
    this.setSelectedStudyPlanContext(reconciled);
  }

  private reconcileUpdatedStudyPlan(
    existing: StudyPlanListItem,
    updated: StudyPlanConfigurationItem,
  ): StudyPlanListItem {
    const catalogs = this.catalogs();

    return {
      ...existing,
      name: updated.name,
      description: updated.description,
      start: updated.start,
      end: updated.end,
      level_id: updated.level_id,
      school_year_id: updated.school_year_id,
      section_id: updated.section_id,
      study_plan_structure_id: updated.study_plan_structure_id,
      schedule_type_id: updated.schedule_type_id,
      level:
        catalogs.levels.find((level) => level.id === updated.level_id) ??
        existing.level ??
        null,
      school_year:
        catalogs.school_years.find((schoolYear) => schoolYear.id === updated.school_year_id) ??
        existing.school_year ??
        null,
      section:
        catalogs.sections.find((section) => section.id === updated.section_id) ??
        existing.section ??
        null,
      structure:
        catalogs.study_plan_structures.find(
          (structure) => structure.id === updated.study_plan_structure_id,
        ) ??
        existing.structure ??
        null,
      schedule_type:
        catalogs.schedule_types.find(
          (scheduleType) => scheduleType.id === updated.schedule_type_id,
        ) ??
        existing.schedule_type ??
        null,
    };
  }

  protected startCreateStudyPlan(): void {
    const route = this.apiRoute();
    const schoolYearId = this.selectedSchoolYearId();
    const sectionId = this.selectedSectionId();

    if (!route || !schoolYearId || !sectionId || !this.canCreateStudyPlan()) {
      return;
    }

    this.createStudyPlanForm.reset({
      name: '',
      description: '',
      start: '',
      end: '',
      level_id: null,
      school_year_id: schoolYearId,
      section_id: sectionId,
      study_plan_structure_id: null,
      schedule_type_id: null,
    });
    this.isCreatingStudyPlan.set(true);
    this.setStudyPlansListContext();
  }

  protected cancelCreateStudyPlan(): void {
    this.resetCreateStudyPlanForm();
    this.isCreatingStudyPlan.set(false);
    this.setStudyPlansListContext();
  }

  protected submitCreateStudyPlan(): void {
    const route = this.apiRoute();

    if (!route || !this.canCreateStudyPlan()) {
      return;
    }

    if (this.createStudyPlanForm.invalid) {
      this.createStudyPlanForm.markAllAsTouched();
      return;
    }

    this.executeMutationRequest(
      this.api.post<{ 'study-plan'?: StudyPlanListItem }>(route, this.buildCreatePayload()),
      (response) => {
        const created = response.data?.['study-plan'];

        if (!created) {
          this.resetCreateStudyPlanForm();
          this.isCreatingStudyPlan.set(false);
          this.reloadStudyPlans();
          return;
        }

        this.studyPlans.update((current) => this.sortStudyPlansForList([...current, created]));
        this.selectedStudyPlan.set(created);
        this.resetCreateStudyPlanForm();
        this.isCreatingStudyPlan.set(false);
        this.setSelectedStudyPlanContext(created);
      },
    );
  }

  private buildCreatePayload(): StudyPlanCreatePayload {
    const value = this.createStudyPlanForm.getRawValue();

    return {
      name: value.name.trim(),
      description: value.description.trim() || null,
      start: value.start,
      end: value.end,
      level_id: Number(value.level_id),
      school_year_id: Number(value.school_year_id),
      section_id: Number(value.section_id),
      study_plan_structure_id: Number(value.study_plan_structure_id),
      schedule_type_id: Number(value.schedule_type_id),
    };
  }

  private resetCreateStudyPlanForm(): void {
    this.createStudyPlanForm.reset({
      name: '',
      description: '',
      start: '',
      end: '',
      level_id: null,
      school_year_id: null,
      section_id: null,
      study_plan_structure_id: null,
      schedule_type_id: null,
    });
  }

  private sortStudyPlansForList(studyPlans: StudyPlanListItem[]): StudyPlanListItem[] {
    return [...studyPlans].sort(
      (first, second) =>
        first.school_year_id - second.school_year_id ||
        first.section_id - second.section_id ||
        first.level_id - second.level_id ||
        first.id - second.id,
    );
  }

  protected async onDelete(): Promise<void> {
    const studyPlan = this.selectedStudyPlan();
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
      this.studyPlans.update((current) => current.filter((item) => item.id !== studyPlan.id));
      this.selectedStudyPlan.set(null);
      this.setStudyPlansListContext();
    });
  }
}
