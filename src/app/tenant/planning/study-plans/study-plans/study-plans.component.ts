import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { ScreenOptionItem, ScreenChildItem } from '@shared/interfaces/configuration.interfaces';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';
import {
  IStudyPlanModalData,
  IStudyPlanModalResult,
  StudyPlanModalComponent,
} from '../study-plan-modal/study-plan-modal.component';
import { Router } from '@angular/router';

export interface StudyPlanListItem {
  id: number;
  name: string;
  description?: string | null;
  start: string;
  end: string;
  level_id: number;
  school_year_id: number;
  section_id: number;
  studyplan_structure_id: number;
  schedule_type_id: number;
  level?: unknown;
  school_year?: unknown;
  section?: unknown;
}

export interface StudyPlansCatalogItem {
  id: number;
  name: string;
  description?: string | null;
  translation?: string | null;
  order?: number | null;
  active?: boolean;
}

export interface SchoolYearCatalogItem {
  id: number;
  name: string;
  current?: boolean;
  visible?: boolean;
  order?: number | null;
}

export interface StudyPlanStructureCatalogItem extends StudyPlansCatalogItem {
  stages?: number | null;
  stage_name?: string | null;
}

export interface StudyPlansCatalogs {
  levels: StudyPlansCatalogItem[];
  school_years: SchoolYearCatalogItem[];
  sections: StudyPlansCatalogItem[];
  studyplan_structures: StudyPlanStructureCatalogItem[];
  schedule_types: StudyPlansCatalogItem[];
}

export interface StudyPlansIndexData {
  'study-plans'?: StudyPlanListItem[];
  options?: ScreenOptionItem[];
  children?: ScreenChildItem[];
  catalogs?: Partial<StudyPlansCatalogs>;
}

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
  ],
  templateUrl: './study-plans.component.html',
  styleUrl: './study-plans.component.scss',
})
export class StudyPlansComponent extends SkolansBaseComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly studyPlans = signal<StudyPlanListItem[]>([]);
  protected readonly selectedStudyPlan = signal<StudyPlanListItem | null>(null);

  protected readonly catalogs = signal<StudyPlansCatalogs>({
    levels: [],
    school_years: [],
    sections: [],
    studyplan_structures: [],
    schedule_types: [],
  });

  protected readonly sectionControl = new FormControl<number | null>(null);
  protected readonly schoolYearControl = new FormControl<number | null>(null);

  protected readonly selectedSectionId = signal<number | null>(null);
  protected readonly selectedSchoolYearId = signal<number | null>(null);

  /* =====================================================
   * 🔥 CHILDREN (nuevo)
   * ===================================================== */

  protected readonly hasSelectedPlan = computed(() => !!this.selectedStudyPlan());

  protected readonly studyPlanGroups = [
    {
      key: 'information',
      controllers: ['study-plan-information'],
    },
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

  protected readonly canCreateStudyPlan = computed(
    () => !!this.selectedSectionId() && !!this.selectedSchoolYearId(),
  );

  ngOnInit(): void {
    this.initRouteMeta();
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
        levels: (res.data?.catalogs?.levels ?? []).map((item) => this.mapCatalogLabel(item)),
        school_years: res.data?.catalogs?.school_years ?? [],
        sections: (res.data?.catalogs?.sections ?? []).map((item) => this.mapCatalogLabel(item)),
        studyplan_structures: (res.data?.catalogs?.studyplan_structures ?? []).map((item) =>
          this.mapCatalogLabel(item),
        ),
        schedule_types: (res.data?.catalogs?.schedule_types ?? []).map((item) =>
          this.mapCatalogLabel(item),
        ),
      });

      this.applyDefaultFilters();
      this.selectedStudyPlan.set(null);
    });
  }

  protected selectStudyPlan(studyPlan: StudyPlanListItem): void {
    this.selectedStudyPlan.set(studyPlan);
  }

  protected clearSelectedStudyPlan(): void {
    this.selectedStudyPlan.set(null);
  }

  private watchFilters(): void {
    this.sectionControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((sectionId) => {
        this.selectedSectionId.set(sectionId);
        this.selectedStudyPlan.set(null);
      });

    this.schoolYearControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((schoolYearId) => {
        this.selectedSchoolYearId.set(schoolYearId);
        this.selectedStudyPlan.set(null);
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

  private mapCatalogLabel<T extends StudyPlansCatalogItem>(item: T): T & { label: string } {
    return {
      ...item,
      label: item.translation || item.name,
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

  protected getStudyPlanChildDescription(name: string): string {
    const descriptions: Record<string, string> = {
      'study-plan-information': 'planning.study-plans.children.information',
      'study-plan-academics': 'planning.study-plans.children.academics',
      'study-plan-scheduling': 'planning.study-plans.children.scheduling',
      'study-plan-evaluation': 'planning.study-plans.children.evaluation',
      'study-plan-report-cards': 'planning.study-plans.children.report-cards',
    };

    return descriptions[name] ?? 'planning.study-plans.messages.open-section';
  }

  protected getStructureName(studyPlan: StudyPlanListItem): string {
    return this.findCatalogLabel(
      this.catalogs().studyplan_structures,
      studyPlan.studyplan_structure_id,
    );
  }

  protected getScheduleTypeName(studyPlan: StudyPlanListItem): string {
    return this.findCatalogLabel(this.catalogs().schedule_types, studyPlan.schedule_type_id);
  }

  private findCatalogLabel(items: StudyPlansCatalogItem[], id: number): string {
    const item = items.find((catalogItem) => catalogItem.id === id);
    return item?.translation || item?.description || item?.name || '-';
  }

  protected openStudyPlanChild(child: ScreenChildItem, plan: StudyPlanListItem): void {
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

  protected async openCreateModal(): Promise<void> {
    const route = this.apiRoute();
    const schoolYearId = this.selectedSchoolYearId();
    const sectionId = this.selectedSectionId();

    if (!route || !schoolYearId || !sectionId) {
      return;
    }

    const result = await this.modal.open<IStudyPlanModalData, IStudyPlanModalResult>({
      component: StudyPlanModalComponent,
      data: {
        school_year_id: schoolYearId,
        section_id: sectionId,
        catalogs: {
          levels: this.catalogs().levels,
          studyplan_structures: this.catalogs().studyplan_structures,
          schedule_types: this.catalogs().schedule_types,
        },
      },
      title: this.translate.instant('planning.study-plans.add'),
      description: this.translate.instant('planning.study-plans.messages.create-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.executeMutationRequest(
      this.api.post<{ 'study-plan'?: StudyPlanListItem }>(route, result.payload),
      (response) => {
        const created = response.data?.['study-plan'];

        if (!created) {
          this.reloadStudyPlans();
          return;
        }

        this.studyPlans.update((current) => [...current, created]);
        this.selectedStudyPlan.set(created);
      },
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
    });
  }
}
