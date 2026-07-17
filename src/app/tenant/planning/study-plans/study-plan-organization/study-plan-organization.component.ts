import { Component, computed, effect, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';

import { ScheduleStructureViewComponent } from './components/schedule-structure-view/schedule-structure-view.component';
import {
  StudyPlanAcademicAssignmentsSummaryComponent,
  type StudyPlanAcademicAssignmentsSelection,
} from './components/study-plan-academic-assignments-summary/study-plan-academic-assignments-summary.component';
import { StudyPlanAcademicAssignmentsViewComponent } from './components/study-plan-academic-assignments-view/study-plan-academic-assignments-view.component';
import type { StudyPlanAcademicAssignmentsOrganizationMutation } from './components/study-plan-academic-assignments-grade-detail/study-plan-academic-assignments-grade-detail.component';
import { StudyPlanScheduleStructureSummaryComponent } from './components/study-plan-schedule-structure-summary/study-plan-schedule-structure-summary.component';
import { StudyPlanSchedulesSummaryComponent } from './components/study-plan-schedules-summary/study-plan-schedules-summary.component';
import { StudyPlanStageGroupsViewComponent } from './components/study-plan-stage-groups-view/study-plan-stage-groups-view.component';
import { StudyPlanStageGroupsSummaryComponent } from './components/study-plan-stage-groups-summary/study-plan-stage-groups-summary.component';
import { ScreenChildItem, ScreenOptionItem } from 'app/shared/interfaces/access.interfaces';
import type { ISchoolYear, ISection } from '@shared/interfaces/administration.interfaces';
import type {
  IGrade,
  IGender,
  ILevel,
  IScheduleType,
} from '@shared/interfaces/configuration.interfaces';
import type {
  IStudyPlan,
  IStudyPlanStage,
  IStudyPlanTerm,
} from '@shared/interfaces/study-plan-interfaces';
import { UiIconComponent } from 'app/shared/ui/ui-icon/ui-icon';

interface StudyPlanOrganizationResponse {
  options: ScreenOptionItem[];
  children: ScreenChildItem[];
  study_plan: StudyPlanOrganizationStudyPlan;
  summaries: StudyPlanOrganizationSummaries;
}

interface StudyPlanOrganizationStudyPlan extends Pick<
  IStudyPlan,
  | 'id'
  | 'name'
  | 'description'
  | 'start'
  | 'end'
  | 'level_id'
  | 'school_year_id'
  | 'section_id'
  | 'study_plan_structure_id'
  | 'schedule_type_id'
> {
  schedule_type: Pick<IScheduleType, 'id' | 'name' | 'translation' | 'help_translation'> | null;
  level: StudyPlanOrganizationLevel | null;
  school_year: Pick<ISchoolYear, 'id' | 'name'> | null;
  section: Pick<ISection, 'id' | 'name'> | null;
  stages: StudyPlanOrganizationStage[];
}

interface StudyPlanOrganizationLevel extends Pick<ILevel, 'id' | 'name' | 'description'> {
  grades: Pick<IGrade, 'id' | 'name' | 'description'>[];
}

interface StudyPlanOrganizationStage extends Pick<
  IStudyPlanStage,
  'id' | 'study_plan_id' | 'name' | 'has_crossovers'
> {
  terms: Pick<IStudyPlanTerm, 'id' | 'study_plan_stage_id' | 'code' | 'name'>[];
}

export interface StudyPlanOrganizationSummaries {
  schedule_structure: StudyPlanScheduleStructureSummary;
  stage_groups: StudyPlanStageGroupsSummary;
  academic_assignments: StudyPlanAcademicAssignmentsSummary;
  schedules: StudyPlanSchedulesSummary;
}

export type StudyPlanOrganizationSummariesPatch = Partial<
  Pick<StudyPlanOrganizationSummaries, 'stage_groups' | 'academic_assignments' | 'schedules'>
>;

export interface StudyPlanScheduleStructureSummary {
  schedule_type_id: number;
  structures_count: number;
  items: StudyPlanScheduleStructureSummaryItem[];
}

interface StudyPlanScheduleStructureSummaryItem {
  id: number;
  name: string;
  active: boolean;
  order: number;
  segments_count: number;
  segments: StudyPlanScheduleStructureSegmentSummary[];
}

interface StudyPlanScheduleStructureSegmentSummary {
  id: number;
  name: string;
  gender_id: number | null;
  gender: IGender | null;
  active: boolean;
  order: number;
  days: StudyPlanScheduleStructureDaySummary[];
  blocks_count: number;
  breaks_count: number;
  total_blocks_count: number;
}

interface StudyPlanScheduleStructureDaySummary {
  id: number;
  translation: string;
}

export interface StudyPlanStageGroupsSummary {
  stages_count: number;
  items: StudyPlanStageGroupsSummaryStage[];
}

export interface StudyPlanStageGroupsSelection {
  stageId: number;
  gradeId: number | null;
  mode: 'grade' | 'crossover';
}

interface StudyPlanStageGroupsSummaryStage extends Pick<
  IStudyPlanStage,
  'id' | 'study_plan_id' | 'name' | 'has_crossovers'
> {
  groups_count: number;
  grades: StudyPlanStageGroupsSummaryGrade[];
}

type StudyPlanStageGroupsSummaryGrade =
  | StudyPlanStageGroupsSummaryGradeItem
  | StudyPlanStageGroupsSummaryCrossoverItem;

interface StudyPlanStageGroupsSummaryGradeItem extends Pick<IGrade, 'id' | 'name' | 'description'> {
  type: 'grade';
  groups_count: number;
}

interface StudyPlanStageGroupsSummaryCrossoverItem {
  id: null;
  type: 'crossover';
  name: string;
  description: string;
  groups_count: number;
}

export interface StudyPlanAcademicAssignmentsSummary {
  stages_count: number;
  items: StudyPlanAcademicAssignmentsSummaryStage[];
}

interface StudyPlanAcademicAssignmentsSummaryStage extends Pick<
  IStudyPlanStage,
  'id' | 'study_plan_id' | 'name' | 'has_crossovers'
> {
  assigned_count: number;
  expected_count: number;
  completion_percent: number;
  completion_color: string;
  grades: StudyPlanAcademicAssignmentsSummaryGrade[];
}

type StudyPlanAcademicAssignmentsSummaryGrade =
  | StudyPlanAcademicAssignmentsSummaryGradeItem
  | StudyPlanAcademicAssignmentsSummaryCrossoverItem;

interface StudyPlanAcademicAssignmentsSummaryGradeItem extends Pick<
  IGrade,
  'id' | 'name' | 'description'
> {
  type: 'grade';
  subjects_count: number;
  groups_count: number;
  assigned_count: number;
  expected_count: number;
  completion_percent: number;
  completion_color: string;
}

interface StudyPlanAcademicAssignmentsSummaryCrossoverItem {
  id: null;
  type: 'crossover';
  name: string;
  description: string;
  subjects_count: number;
  groups_count: number;
  assigned_count: number;
  expected_count: number;
  completion_percent: number;
  completion_color: string;
}

export interface StudyPlanSchedulesSummary {
  stages_count: number;
  variants_count: number;
  variants: StudyPlanSchedulesSummaryVariant[];
  items: StudyPlanSchedulesSummaryStage[];
}

interface StudyPlanSchedulesSummaryVariant {
  id: number;
  code: string;
  name: string;
}

interface StudyPlanSchedulesSummaryVariantProgress extends StudyPlanSchedulesSummaryVariant {
  groups_count: number;
  scheduled_groups_count: number;
  completion_percent: number;
  completion_color: string;
}

interface StudyPlanSchedulesSummaryStage extends Pick<
  IStudyPlanStage,
  'id' | 'study_plan_id' | 'name' | 'has_crossovers'
> {
  subjects_count: number;
  groups_count: number;
  scheduled_groups_count: number;
  completion_percent: number;
  completion_color: string;
  variants: StudyPlanSchedulesSummaryVariantProgress[];
  grades: StudyPlanSchedulesSummaryGrade[];
}

type StudyPlanSchedulesSummaryGrade =
  | StudyPlanSchedulesSummaryGradeItem
  | StudyPlanSchedulesSummaryCrossoverItem;

interface StudyPlanSchedulesSummaryGradeItem extends Pick<IGrade, 'id' | 'name' | 'description'> {
  type: 'grade';
  subjects_count: number;
  groups_count: number;
  scheduled_groups_count: number;
  completion_percent: number;
  completion_color: string;
  variants: StudyPlanSchedulesSummaryVariantProgress[];
}

interface StudyPlanSchedulesSummaryCrossoverItem {
  id: null;
  type: 'crossover';
  name: string;
  description: string;
  subjects_count: number;
  groups_count: number;
  scheduled_groups_count: number;
  completion_percent: number;
  completion_color: string;
  variants: StudyPlanSchedulesSummaryVariantProgress[];
}

@Component({
  selector: 'app-study-plan-organization',
  imports: [
    TranslatePipe,
    StudyPlanScheduleStructureSummaryComponent,
    StudyPlanStageGroupsSummaryComponent,
    StudyPlanAcademicAssignmentsSummaryComponent,
    StudyPlanSchedulesSummaryComponent,
    ScheduleStructureViewComponent,
    StudyPlanStageGroupsViewComponent,
    StudyPlanAcademicAssignmentsViewComponent,
    UiIconComponent,
  ],
  templateUrl: './study-plan-organization.component.html',
  styleUrl: './study-plan-organization.component.scss',
})
export class StudyPlanOrganizationComponent extends SkolansBaseComponent {
  readonly studyPlan = input<unknown | null>(null);
  readonly route = input<string | null>(null);
  readonly refreshToken = input(0);

  readonly organizationStudyPlan = signal<StudyPlanOrganizationStudyPlan | null>(null);
  readonly organizationSummaries = signal<StudyPlanOrganizationSummaries | null>(null);
  readonly selectedStructureId = signal<number | null>(null);
  readonly selectedSegmentId = signal<number | null>(null);
  readonly selectedGroupsStageId = signal<number | null>(null);
  readonly selectedGroupsGradeId = signal<number | null>(null);
  readonly selectedGroupsMode = signal<'grade' | 'crossover' | null>(null);
  readonly selectedAcademicAssignmentStageId = signal<number | null>(null);
  readonly selectedAcademicAssignmentGradeId = signal<number | null | undefined>(undefined);

  readonly currentStudyPlan = computed(() => this.organizationStudyPlan() ?? this.studyPlan());
  readonly scheduleStructureSummary = computed(
    () => this.organizationSummaries()?.schedule_structure ?? null,
  );
  readonly stageGroupsSummary = computed(() => this.organizationSummaries()?.stage_groups ?? null);
  readonly academicAssignmentsSummary = computed(
    () => this.organizationSummaries()?.academic_assignments ?? null,
  );
  readonly selectedAcademicAssignmentStage = computed(() => {
    const stageId = this.selectedAcademicAssignmentStageId();

    if (stageId === null) {
      return null;
    }

    return (
      this.academicAssignmentsSummary()?.items.find((stage) => stage.id === stageId) ?? null
    );
  });
  readonly selectedAcademicAssignmentGradeIdForView = computed(() => {
    const gradeId = this.selectedAcademicAssignmentGradeId();

    return gradeId === undefined ? null : gradeId;
  });
  readonly schedulesSummary = computed(() => this.organizationSummaries()?.schedules ?? null);
  /**
   * Backend-resolved child route for the embedded schedule structure context.
   * Organization owns route resolution and passes the route to the presentational summary.
   */
  readonly scheduleStructureRoute = computed(() =>
    this.getScreenChildRoute('study-plan-schedule-structures'),
  );
  /**
   * Backend-resolved child route for the embedded academic assignments context.
   * Organization owns route resolution and passes it to the assignments view.
   */
  readonly academicAssignmentsRoute = computed(() =>
    this.getScreenChildRoute('study-plan-academic-assignments'),
  );
  /**
   * Backend-resolved child route for the embedded stage groups context.
   * Organization owns route resolution and passes it to the request-capable list.
   */
  readonly stageGroupsRoute = computed(() => this.getScreenChildRoute('study-plan-stage-groups'));
  /**
   * Backend permissions determine whether the schedule structure child summary is visible.
   */
  readonly hasScheduleStructureChild = computed(() =>
    this.hasScreenChild('study-plan-schedule-structures'),
  );
  /**
   * Backend permissions determine whether the stage groups child summary is visible.
   */
  readonly hasStageGroupsChild = computed(() => this.hasScreenChild('study-plan-stage-groups'));
  /**
   * Backend permissions determine whether the academic assignments child summary is visible.
   */
  readonly hasAcademicAssignmentsChild = computed(() =>
    this.hasScreenChild('study-plan-academic-assignments'),
  );
  /**
   * Backend permissions determine whether the schedules child summary is visible.
   */
  readonly hasSchedulesChild = computed(() => this.hasScreenChild('study-plan-schedules'));
  /**
   * Child options originate from backend permissions and are passed into the summary.
   */
  readonly scheduleStructureOptions = computed(
    () => this.getScreenChild('study-plan-schedule-structures')?.options ?? [],
  );
  /**
   * Child options originate from backend permissions and are passed into the summary.
   */
  readonly stageGroupsOptions = computed(
    () => this.getScreenChild('study-plan-stage-groups')?.options ?? [],
  );
  /**
   * Child options originate from backend permissions and are passed into the summary.
   */
  readonly academicAssignmentsOptions = computed(
    () => this.getScreenChild('study-plan-academic-assignments')?.options ?? [],
  );
  /**
   * Child options originate from backend permissions and are passed into the summary.
   */
  readonly schedulesOptions = computed(
    () => this.getScreenChild('study-plan-schedules')?.options ?? [],
  );
  readonly scheduleTypeTranslationKey = computed(
    () => this.organizationStudyPlan()?.schedule_type?.translation ?? 'common.no-data',
  );
  readonly scheduleTypeHelpTranslationKey = computed(
    () => this.organizationStudyPlan()?.schedule_type?.help_translation ?? '',
  );
  readonly hasScheduleConfiguration = computed(
    () => this.organizationStudyPlan()?.schedule_type?.name !== 'none',
  );

  constructor() {
    super();

    effect(() => {
      const route = this.route();

      this.refreshToken();

      if (!route) {
        return;
      }

      this.loadOrganization(route);
    });
  }

  private loadOrganization(route: string): void {
    this.executeSilentRequest<StudyPlanOrganizationResponse>(this.api.get(route), (res) => {
      this.setScreenOptions(res.data.options);
      this.setScreenChildren(res.data.children);
      this.organizationStudyPlan.set(res.data.study_plan);
      this.organizationSummaries.set(res.data.summaries);
    });
  }

  protected reloadOrganization(): void {
    const route = this.route();

    if (!route) {
      return;
    }

    this.loadOrganization(route);
  }

  protected openScheduleStructure(structureId: number): void {
    this.selectedStructureId.set(structureId);
    this.selectedSegmentId.set(null);
    this.closeStageGroupsView();
    this.closeAcademicAssignmentsView();
  }

  protected openScheduleSegment(structureId: number, segmentId: number): void {
    this.selectedStructureId.set(structureId);
    this.selectedSegmentId.set(segmentId);
    this.closeStageGroupsView();
    this.closeAcademicAssignmentsView();
  }

  protected closeScheduleStructureView(): void {
    this.selectedStructureId.set(null);
    this.selectedSegmentId.set(null);
  }

  protected openStageGroups(selection: StudyPlanStageGroupsSelection): void {
    this.closeScheduleStructureView();
    this.closeAcademicAssignmentsView();
    this.selectedGroupsStageId.set(selection.stageId);
    this.selectedGroupsGradeId.set(selection.gradeId);
    this.selectedGroupsMode.set(selection.mode);
  }

  protected closeStageGroupsView(): void {
    this.selectedGroupsStageId.set(null);
    this.selectedGroupsGradeId.set(null);
    this.selectedGroupsMode.set(null);
  }

  protected openAcademicAssignments(selection: StudyPlanAcademicAssignmentsSelection): void {
    this.closeScheduleStructureView();
    this.closeStageGroupsView();
    this.selectedAcademicAssignmentStageId.set(selection.stageId);
    this.selectedAcademicAssignmentGradeId.set(selection.gradeId);
  }

  protected closeAcademicAssignmentsView(): void {
    this.selectedAcademicAssignmentStageId.set(null);
    this.selectedAcademicAssignmentGradeId.set(undefined);
  }

  protected handleAcademicAssignmentMutation(
    change: StudyPlanAcademicAssignmentsOrganizationMutation,
  ): void {
    this.applyOrganizationSummariesPatch(change.organization_summaries);
  }

  protected applyOrganizationSummariesPatch(
    patch: StudyPlanOrganizationSummariesPatch | undefined,
  ): void {
    const summaries = this.organizationSummaries();

    if (!summaries || !patch) {
      return;
    }

    this.organizationSummaries.set({
      ...summaries,
      ...patch,
    });
  }
}
