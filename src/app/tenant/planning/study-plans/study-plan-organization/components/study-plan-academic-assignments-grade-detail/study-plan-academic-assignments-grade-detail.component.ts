import { Component, computed, effect, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import type { IGender } from '@shared/interfaces/configuration.interfaces';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import type {
  StudyPlanAcademicAssignmentsSummary,
  StudyPlanOrganizationSummariesPatch,
} from '../../study-plan-organization.component';
import { StudyPlanAcademicAssignmentsSubjectCardComponent } from '../study-plan-academic-assignments-subject-card/study-plan-academic-assignments-subject-card.component';
import { SubjectTeamsAssignmentComponent } from '../subject-teams-assignment/subject-teams-assignment.component';

type StudyPlanAcademicAssignmentsSummaryStage =
  StudyPlanAcademicAssignmentsSummary['items'][number];

export type ConfigurationStatus = 'empty' | 'pending' | 'partial' | 'complete';

interface DetailMetric {
  key: string;
  icon: string;
  label: string;
  value: number;
}

export interface StudyPlanAcademicAssignmentsGradeDetailResponse {
  options: ScreenOptionItem[];
  catalogs: StudyPlanAcademicAssignmentsCatalogs;
  stage: StudyPlanAcademicAssignmentsStagePayload;
  grade: StudyPlanAcademicAssignmentsGradeDetail | null;
}

export interface StudyPlanAcademicAssignmentsCatalogs {
  genders: IGender[];
}

export const EMPTY_STUDY_PLAN_ACADEMIC_ASSIGNMENTS_CATALOGS: StudyPlanAcademicAssignmentsCatalogs =
  {
    genders: [],
  };

export interface StudyPlanAcademicAssignmentsStagePayload {
  id: number;
  study_plan_id: number;
  name: string | null;
  start_date?: string | null;
  end_date?: string | null;
  order?: number | null;
  has_crossovers?: boolean;
}

export interface StudyPlanAcademicAssignmentsGradeDetail {
  id: number | null;
  type: 'grade' | 'crossover';
  summary: StudyPlanAcademicAssignmentsGradeSummary;
  subjects: StudyPlanAcademicAssignmentsGradeSubject[];
}

export interface StudyPlanAcademicAssignmentsGradeSummary {
  subjects_count: number;
  groups_count: number;
  teachers_count: number;
  teams_count: number;
  schedules_count: number;
  schedule_required: boolean;
  configured_groups_count: number;
  pending_groups_count: number;
  configured_percent: number;
  progress_color: string;
  status: ConfigurationStatus;
}

export interface StudyPlanAcademicAssignmentsGradeSubject {
  id: number;
  subject_id: number;
  name: string | null;
  code: string | null;
  subject_type: StudyPlanAcademicAssignmentsSubjectTypePayload | null;
  summary: StudyPlanAcademicAssignmentsSubjectSummary;
  actions: StudyPlanAcademicAssignmentsSubjectActions;
  groups: StudyPlanAcademicAssignmentsGradeSubjectGroup[];
}

export interface StudyPlanAcademicAssignmentsSubjectTypePayload {
  id: number;
  name: string | null;
  translation: string | null;
  help_translation: string | null;
  can_create: boolean;
  can_remove: boolean;
  automatic: boolean;
  uses_teams: boolean;
}

export interface StudyPlanAcademicAssignmentsSubjectSummary {
  groups_count: number;
  teachers_count: number;
  teams_count: number;
  schedules_count: number;
  schedule_required: boolean;
  configured_groups_count: number;
  pending_groups_count: number;
  configured_percent: number;
  progress_color: string;
  status: ConfigurationStatus;
}

export interface StudyPlanAcademicAssignmentsSubjectActions {
  add_group: boolean;
  manage_teams: boolean;
}

export interface StudyPlanAcademicAssignmentsGradeSubjectGroup {
  /** StudyPlanStageSubjectGroup.id: assignment group id used by Academic Assignments actions. */
  id: number;
  /** StudyPlanStageGroup.id: physical/logical stage group id. */
  stage_group_id: number;
  name: string | null;
  code: string | null;
  color: string | null;
  type: StudyPlanAcademicAssignmentsGroupTypePayload | null;
  grade_capture_enabled: boolean;
  report_card_official_override: boolean | null;
  teachers: StudyPlanAcademicAssignmentsGroupTeacher[];
  summary: StudyPlanAcademicAssignmentsGroupSummary;
  actions: StudyPlanAcademicAssignmentsGroupActions;
}

export interface StudyPlanAcademicAssignmentsGroupTypePayload {
  id: number;
  name: string | null;
  translation: string | null;
  requires_subject: boolean;
}

export interface StudyPlanAcademicAssignmentsGroupTeacher {
  id: number;
  name: string | null;
  initials?: string | null;
  photo?: string | null;
  active: boolean;
}

export interface StudyPlanAcademicAssignmentsGroupSummary {
  teachers_count: number;
  teams_count: number;
  schedules_count: number;
  options_count: number;
  configured_percent: number;
  progress_color: string;
  status: ConfigurationStatus;
  has_teachers: boolean;
  has_teams: boolean;
  has_schedule: boolean;
  schedule_required: boolean;
  has_options: boolean;
}

export interface StudyPlanAcademicAssignmentsGroupActions {
  remove_group: boolean;
  manage_teachers: boolean;
  assign_schedule: boolean;
  manage_options: boolean;
}

export interface StudyPlanAcademicAssignmentsOrganizationMutation {
  grade_summary: StudyPlanAcademicAssignmentsGradeSummary;
  organization_summaries?: StudyPlanOrganizationSummariesPatch;
}

export interface StudyPlanAcademicAssignmentsMutationResult
  extends StudyPlanAcademicAssignmentsOrganizationMutation {
  subject_summary: StudyPlanAcademicAssignmentsSubjectSummary;
}

export interface StudyPlanAcademicAssignmentsSubjectAssignedMutation {
  created_count: number;
  subject: StudyPlanAcademicAssignmentsGradeSubject;
  grade_summary: StudyPlanAcademicAssignmentsGradeSummary;
  organization_summaries: StudyPlanOrganizationSummariesPatch;
}

export interface StudyPlanAcademicAssignmentsTeamsResponse {
  numbering_type: 'alphabetic' | 'numeric' | null;
  subject: StudyPlanAcademicAssignmentsTeamsSubject;
  groups: StudyPlanAcademicAssignmentsTeamsGroup[];
}

export interface StudyPlanAcademicAssignmentsTeamsMutationResult
  extends StudyPlanAcademicAssignmentsTeamsResponse {
  subject_assignment: StudyPlanAcademicAssignmentsGradeSubject;
  subject_summary: StudyPlanAcademicAssignmentsSubjectSummary;
  grade_summary: StudyPlanAcademicAssignmentsGradeSummary;
  organization_summaries: StudyPlanOrganizationSummariesPatch;
}

export interface StudyPlanAcademicAssignmentsTeamsSubject {
  id: number;
  subject_id: number;
  name: string | null;
  code: string | null;
  subject_type: StudyPlanAcademicAssignmentsSubjectTypePayload | null;
}

export interface StudyPlanAcademicAssignmentsTeamsGroup {
  id: number;
  code: string;
  name: string;
  color: string | null;
  quota: number;
  active: boolean;
  has_teams: boolean;
  teams_count: number;
}

@Component({
  selector: 'app-study-plan-academic-assignments-grade-detail',
  imports: [
    TranslatePipe,
    StudyPlanAcademicAssignmentsSubjectCardComponent,
    SubjectTeamsAssignmentComponent,
    UiButtonComponent,
    UiIconComponent,
  ],
  templateUrl: './study-plan-academic-assignments-grade-detail.component.html',
  styleUrl: './study-plan-academic-assignments-grade-detail.component.scss',
})
export class StudyPlanAcademicAssignmentsGradeDetailComponent extends SkolansBaseComponent {
  readonly route = input.required<string | null>();
  readonly stage = input.required<StudyPlanAcademicAssignmentsSummaryStage | null>();
  readonly gradeId = input.required<number | null>();
  readonly reloadToken = input(0);
  readonly catalogs = input<StudyPlanAcademicAssignmentsCatalogs>(
    EMPTY_STUDY_PLAN_ACADEMIC_ASSIGNMENTS_CATALOGS,
  );
  readonly assignmentMutation = output<StudyPlanAcademicAssignmentsMutationResult>();

  private readonly loadedKey = signal<string | null>(null);
  private readonly loadedReloadToken = signal<number | null>(null);

  protected readonly response = signal<StudyPlanAcademicAssignmentsGradeDetailResponse | null>(
    null,
  );
  protected readonly teacherEditorSubjectIds = signal<number[]>([]);
  protected readonly scheduleEditorSubjectIds = signal<number[]>([]);
  protected readonly teamsSubjectId = signal<number | null>(null);
  protected readonly closeFocusEditorsToken = signal(0);
  protected readonly grade = computed(() => this.response()?.grade ?? null);
  protected readonly catalogsContext = computed(() => this.response()?.catalogs ?? this.catalogs());
  protected readonly subjects = computed(() => this.grade()?.subjects ?? []);
  protected readonly expandedSubjectCardIds = computed(() => [
    ...new Set([
      ...this.teacherEditorSubjectIds(),
      ...this.scheduleEditorSubjectIds(),
      ...(this.teamsSubjectId() === null ? [] : [this.teamsSubjectId()!]),
    ]),
  ]);
  protected readonly subjectSearch = signal('');
  protected readonly reviewPendingSubjects = signal(false);
  protected readonly pendingSubjects = computed(() =>
    this.subjects().filter((subject) => subject.summary.status !== 'complete'),
  );
  protected readonly reviewGradeOption = computed(() => this.getScreenOption('review-grade'));
  protected readonly pendingReviewGradeOption = computed(() =>
    this.pendingSubjects().length > 0 ? this.reviewGradeOption() : null,
  );
  protected readonly canReviewPendingSubjects = computed(
    () => this.pendingReviewGradeOption() !== null,
  );
  protected readonly filteredSubjects = computed(() => {
    const query = this.normalizeSearchText(this.subjectSearch());
    const source = this.reviewPendingSubjects() ? this.pendingSubjects() : this.subjects();

    if (!query) {
      return source;
    }

    return source.filter((subject) => this.matchesSubjectSearch(subject, query));
  });
  protected readonly visibleSubjects = computed(() => {
    const focusedSubjectId = this.focusedSubjectId();
    const filteredSubjects = this.filteredSubjects();

    if (focusedSubjectId !== null) {
      return filteredSubjects.filter((subject) => subject.id === focusedSubjectId);
    }

    return filteredSubjects;
  });
  protected readonly focusedSubjectId = computed(
    () =>
      this.teamsSubjectId() ??
      this.teacherEditorSubjectIds()[0] ??
      this.scheduleEditorSubjectIds()[0] ??
      null,
  );
  protected readonly hasFocus = computed(() => this.focusedSubjectId() !== null);
  protected readonly selectedGradeSummary = computed(() => {
    const gradeId = this.gradeId();

    return (
      this.stage()?.grades.find((grade) => {
        if (grade.type === 'crossover') {
          return gradeId === null;
        }

        return grade.id === gradeId;
      }) ?? null
    );
  });
  protected readonly hasSelectedGrade = computed(() => this.selectedGradeSummary() !== null);
  protected readonly title = computed(() => {
    const grade = this.selectedGradeSummary();

    if (!grade) {
      return '';
    }

    return grade.name;
  });
  protected readonly description = computed(() => {
    const grade = this.selectedGradeSummary();

    if (!grade) {
      return '';
    }

    return grade.description ?? '';
  });

  constructor() {
    super();

    effect(() => {
      const route = this.route();
      const stage = this.stage();
      const gradeId = this.gradeId();
      const reloadToken = this.reloadToken();

      const normalizedRoute = route?.trim() ?? '';

      if (!normalizedRoute || !stage) {
        this.resetState();
        return;
      }

      const detailRoute = this.detailRoute(normalizedRoute, stage.id, gradeId);
      const routeChanged = this.loadedKey() !== detailRoute;

      if (!routeChanged && this.loadedReloadToken() === reloadToken) {
        return;
      }

      this.loadedKey.set(detailRoute);
      this.loadedReloadToken.set(reloadToken);

      if (routeChanged) {
        this.subjectSearch.set('');
        this.reviewPendingSubjects.set(false);
        this.teacherEditorSubjectIds.set([]);
        this.scheduleEditorSubjectIds.set([]);
        this.teamsSubjectId.set(null);
        this.response.set(null);
        this.clearScreenOptions();
      }

      this.loadDetail(detailRoute);
    });

    effect(() => {
      if (!this.canReviewPendingSubjects()) {
        this.reviewPendingSubjects.set(false);
      }
    });

    effect(() => {
      const focusedSubjectId = this.focusedSubjectId();

      if (focusedSubjectId === null) {
        return;
      }

      if (!this.subjects().some((subject) => subject.id === focusedSubjectId)) {
        this.teacherEditorSubjectIds.set([]);
        this.scheduleEditorSubjectIds.set([]);
        this.teamsSubjectId.set(null);
      }
    });
  }

  protected gradeMetrics(summary: StudyPlanAcademicAssignmentsGradeSummary): DetailMetric[] {
    const metrics = [
      this.metric('subjects', 'book-open', 'subjects', summary.subjects_count),
      this.metric('assignments', 'link', 'assignments', summary.groups_count),
      this.metric('teachers', 'user-check', 'teachers', summary.teachers_count),
      this.metric('teams', 'layout-grid', 'teams', summary.teams_count),
    ];

    if (summary.schedule_required) {
      metrics.push(
        this.metric('schedules', 'calendar-check', 'schedules', summary.schedules_count),
      );
    }

    return metrics;
  }

  protected updateSubjectSearch(event: Event): void {
    const inputElement = event.target as HTMLInputElement | null;

    this.subjectSearch.set(inputElement?.value ?? '');
  }

  protected togglePendingSubjectsReview(): void {
    if (!this.canReviewPendingSubjects()) {
      this.reviewPendingSubjects.set(false);
      return;
    }

    this.reviewPendingSubjects.update((reviewing) => !reviewing);
  }

  protected updateTeacherEditorState(subjectId: number, hasOpenTeacherEditors: boolean): void {
    if (hasOpenTeacherEditors) {
      this.teamsSubjectId.set(null);
    }

    this.teacherEditorSubjectIds.update((subjectIds) =>
      this.updateSubjectEditorState(subjectIds, subjectId, hasOpenTeacherEditors),
    );
  }

  protected updateScheduleEditorState(subjectId: number, hasOpenScheduleEditors: boolean): void {
    if (hasOpenScheduleEditors) {
      this.teamsSubjectId.set(null);
    }

    this.scheduleEditorSubjectIds.update((subjectIds) =>
      this.updateSubjectEditorState(subjectIds, subjectId, hasOpenScheduleEditors),
    );
  }

  protected openTeamsEditor(subject: StudyPlanAcademicAssignmentsGradeSubject): void {
    const gradeId = this.gradeId();

    if (gradeId === null || this.teamsSubjectId() === subject.id) {
      return;
    }

    this.closeFocusEditorsToken.update((token) => token + 1);
    this.teacherEditorSubjectIds.set([]);
    this.scheduleEditorSubjectIds.set([]);
    this.teamsSubjectId.set(subject.id);
  }

  protected closeTeamsEditor(): void {
    this.teamsSubjectId.set(null);
  }

  protected isManagingTeams(subject: StudyPlanAcademicAssignmentsGradeSubject): boolean {
    return this.teamsSubjectId() === subject.id;
  }

  protected closeFocus(): void {
    if (!this.hasFocus()) {
      return;
    }

    this.closeFocusEditorsToken.update((token) => token + 1);
    this.teacherEditorSubjectIds.set([]);
    this.scheduleEditorSubjectIds.set([]);
    this.teamsSubjectId.set(null);
  }

  protected handleAssignmentMutation(change: StudyPlanAcademicAssignmentsMutationResult): void {
    const response = this.response();

    if (!response?.grade) {
      return;
    }

    this.response.set({
      ...response,
      grade: {
        ...response.grade,
        summary: change.grade_summary,
      },
    });
    this.assignmentMutation.emit(change);
  }

  protected handleTeamsSaved(change: StudyPlanAcademicAssignmentsTeamsMutationResult): void {
    const response = this.response();

    if (!response?.grade) {
      return;
    }

    this.response.set({
      ...response,
      grade: {
        ...response.grade,
        summary: change.grade_summary,
        subjects: response.grade.subjects.map((subject) =>
          subject.id === change.subject_assignment.id ? change.subject_assignment : subject,
        ),
      },
    });
    this.assignmentMutation.emit({
      subject_summary: change.subject_assignment.summary,
      grade_summary: change.grade_summary,
      organization_summaries: change.organization_summaries,
    });
  }

  protected handleSubjectAssigned(
    change: StudyPlanAcademicAssignmentsSubjectAssignedMutation,
  ): void {
    const response = this.response();

    if (!response?.grade) {
      return;
    }

    this.response.set({
      ...response,
      grade: {
        ...response.grade,
        summary: change.grade_summary,
        subjects: response.grade.subjects.map((subject) =>
          subject.id === change.subject.id ? change.subject : subject,
        ),
      },
    });
    this.assignmentMutation.emit({
      subject_summary: change.subject.summary,
      grade_summary: change.grade_summary,
      organization_summaries: change.organization_summaries,
    });
  }

  private loadDetail(detailRoute: string): void {
    this.executeSilentRequest<StudyPlanAcademicAssignmentsGradeDetailResponse>(
      this.api.get(detailRoute),
      (res) => {
        if (this.loadedKey() !== detailRoute) {
          return;
        }

        this.setScreenOptions(res.data.options);
        this.response.set(res.data);
      },
      () => {
        if (this.loadedKey() !== detailRoute) {
          return;
        }

        this.resetState();
      },
    );
  }

  private detailRoute(route: string, stageId: number, gradeId: number | null): string {
    const gradeQuery = gradeId === null ? '' : encodeURIComponent(String(gradeId));

    return `${route}/${stageId}?grade_id=${gradeQuery}`;
  }

  private resetState(): void {
    this.loadedKey.set(null);
    this.loadedReloadToken.set(null);
    this.subjectSearch.set('');
    this.reviewPendingSubjects.set(false);
    this.teacherEditorSubjectIds.set([]);
    this.scheduleEditorSubjectIds.set([]);
    this.teamsSubjectId.set(null);
    this.response.set(null);
    this.clearScreenOptions();
  }

  private metric(key: string, icon: string, label: string, value: number): DetailMetric {
    return {
      key,
      icon,
      label: `planning.study-plan-organizations.academic-assignments.metrics.${label}`,
      value,
    };
  }

  private updateSubjectEditorState(
    subjectIds: number[],
    subjectId: number,
    active: boolean,
  ): number[] {
    if (active) {
      return subjectIds.includes(subjectId) ? subjectIds : [...subjectIds, subjectId];
    }

    return subjectIds.filter((currentSubjectId) => currentSubjectId !== subjectId);
  }

  private matchesSubjectSearch(
    subject: StudyPlanAcademicAssignmentsGradeSubject,
    query: string,
  ): boolean {
    const translatedSubjectType = subject.subject_type?.translation
      ? this.translate.instant(subject.subject_type.translation)
      : null;

    return [
      subject.name,
      subject.code,
      subject.subject_type?.name,
      subject.subject_type?.translation,
      typeof translatedSubjectType === 'string' ? translatedSubjectType : null,
    ].some((value) => this.normalizeSearchText(value).includes(query));
  }

  private normalizeSearchText(value: string | null | undefined): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase();
  }
}
