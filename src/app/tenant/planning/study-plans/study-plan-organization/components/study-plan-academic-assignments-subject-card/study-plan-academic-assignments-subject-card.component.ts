import { Component, computed, effect, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import {
  type ISklConfirmModalData,
  SklConfirmModal,
} from '@shared/base/skl-confirm-modal/skl-confirm-modal';
import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { UiMetaItemComponent } from '@shared/ui/ui-meta-item/ui-meta-item.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import {
  SubjectGroupCreationComponent,
  type SubjectGroupCreationResponse,
} from '../subject-group-creation/subject-group-creation.component';
import {
  SubjectGroupOptionsEditorComponent,
  type SubjectGroupOptionsSavedPayload,
} from '../subject-group-options-editor/subject-group-options-editor.component';
import {
  SubjectGroupScheduleAssignmentComponent,
  type ScheduleCellMutationResponseDto,
} from '../subject-group-schedule-assignment/subject-group-schedule-assignment.component';
import {
  SubjectGroupTeacherAssignmentComponent,
  type SubjectGroupTeacherAssignmentSavedPayload,
} from '../subject-group-teacher-assignment/subject-group-teacher-assignment.component';
import type {
  ConfigurationStatus,
  StudyPlanAcademicAssignmentsCatalogs,
  StudyPlanAcademicAssignmentsGradeSubject,
  StudyPlanAcademicAssignmentsGradeSubjectGroup,
  StudyPlanAcademicAssignmentsGroupTeacher,
  StudyPlanAcademicAssignmentsMutationResult,
  StudyPlanAcademicAssignmentsSubjectAssignedMutation,
} from '../study-plan-academic-assignments-grade-detail/study-plan-academic-assignments-grade-detail.component';
import type { StudyPlanOrganizationSummariesPatch } from '../../study-plan-organization.component';

type SubjectActionKey = 'add_group' | 'assign_subject' | 'manage_teams';
type GroupActionKey =
  | 'remove_group'
  | 'manage_teachers'
  | 'assign_schedule'
  | 'manage_options';

interface DetailMetric {
  key: string;
  icon: string;
  label: string;
  value: number;
}

interface GroupConditionIcon {
  key: string;
  icon: string;
  title: string;
}

interface RemoveAssignmentGroupResponse extends StudyPlanAcademicAssignmentsMutationResult {
  assignment_group_id: number;
  organization_summaries: StudyPlanOrganizationSummariesPatch;
}

@Component({
  selector: 'app-study-plan-academic-assignments-subject-card',
  imports: [
    TranslatePipe,
    UiButtonComponent,
    UiIconComponent,
    UiMetaItemComponent,
    SubjectGroupCreationComponent,
    SubjectGroupOptionsEditorComponent,
    SubjectGroupScheduleAssignmentComponent,
    SubjectGroupTeacherAssignmentComponent,
  ],
  templateUrl: './study-plan-academic-assignments-subject-card.component.html',
  styleUrl: './study-plan-academic-assignments-subject-card.component.scss',
})
export class StudyPlanAcademicAssignmentsSubjectCardComponent extends SkolansBaseComponent {
  readonly route = input.required<string>();
  readonly stageId = input.required<number>();
  readonly gradeId = input<number | null>(null);
  readonly subject = input.required<StudyPlanAcademicAssignmentsGradeSubject>();
  readonly assignmentOptions = input.required<ScreenOptionItem[]>({ alias: 'options' });
  readonly catalogs = input.required<StudyPlanAcademicAssignmentsCatalogs>();
  readonly closeFocusEditorsToken = input(0);
  readonly teacherEditorStateChange = output<boolean>();
  readonly scheduleEditorStateChange = output<boolean>();
  readonly assignmentMutation = output<StudyPlanAcademicAssignmentsMutationResult>();
  readonly subjectAssigned = output<StudyPlanAcademicAssignmentsSubjectAssignedMutation>();
  readonly manageTeamsRequested = output<StudyPlanAcademicAssignmentsGradeSubject>();

  protected readonly groupsExpanded = signal(false);
  protected readonly groupsSectionMetric = computed(() => {
    const subject = this.subject();

    if (subject.subject_type?.uses_teams === true) {
      return {
        label: 'planning.study-plan-organizations.academic-assignments.metrics.teams',
        count: subject.summary.teams_count,
      };
    }

    return {
      label: 'planning.study-plan-organizations.academic-assignments.metrics.groups',
      count: subject.summary.groups_count,
    };
  });
  protected readonly editingTeacherAssignmentGroupIds = signal<number[]>([]);
  protected readonly editingOptionsAssignmentGroupId = signal<number | null>(null);
  protected readonly editingScheduleAssignmentGroupIds = signal<number[]>([]);
  protected readonly creatingGroupSubjectId = signal<number | null>(null);
  protected readonly hasOpenTeacherEditors = computed(
    () => this.editingTeacherAssignmentGroupIds().length > 0,
  );
  protected readonly hasOpenScheduleEditors = computed(
    () => this.editingScheduleAssignmentGroupIds().length > 0,
  );
  protected readonly requiresSubjectExpansion = computed(
    () => this.hasOpenTeacherEditors() || this.hasOpenScheduleEditors(),
  );

  private readonly visibleTeachersLimit = 3;
  private readonly optionByName = computed(() => {
    return new Map(this.assignmentOptions().map((option) => [option.name, option]));
  });
  protected readonly assignSubjectOption = computed(() => {
    if (this.subject().subject_type?.automatic !== true) {
      return null;
    }

    return this.optionForAction('assign_subject');
  });
  protected readonly manageTeamsOption = computed(() => {
    const subject = this.subject();

    if (subject.subject_type?.uses_teams !== true || !subject.actions.manage_teams) {
      return null;
    }

    return this.optionForAction('manage_teams');
  });

  private handledCloseFocusEditorsToken = 0;

  constructor() {
    super();

    effect(() => {
      const token = this.closeFocusEditorsToken();

      if (token === this.handledCloseFocusEditorsToken) {
        return;
      }

      this.handledCloseFocusEditorsToken = token;

      if (token > 0) {
        this.closeFocusEditors();
      }
    });
  }

  protected toggleGroups(): void {
    this.groupsExpanded.update((expanded) => !expanded);
  }

  protected toggleGroupsFromKeyboard(event: KeyboardEvent): void {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.toggleGroups();
  }

  protected editTeachers(assignmentGroupId: number): void {
    this.editingTeacherAssignmentGroupIds.update((assignmentGroupIds) => {
      if (assignmentGroupIds.includes(assignmentGroupId)) {
        return assignmentGroupIds.filter((currentId) => currentId !== assignmentGroupId);
      }

      return [...assignmentGroupIds, assignmentGroupId];
    });
    this.emitTeacherEditorState();
  }

  protected closeTeacherEditor(assignmentGroupId: number): void {
    if (!this.isEditingTeachers(assignmentGroupId)) {
      return;
    }

    this.editingTeacherAssignmentGroupIds.update((assignmentGroupIds) =>
      assignmentGroupIds.filter((currentId) => currentId !== assignmentGroupId),
    );
    this.emitTeacherEditorState();
  }

  protected editOptions(assignmentGroupId: number): void {
    this.editingOptionsAssignmentGroupId.set(assignmentGroupId);
  }

  protected closeOptionsEditor(): void {
    this.editingOptionsAssignmentGroupId.set(null);
  }

  protected editSchedule(assignmentGroupId: number): void {
    this.editingScheduleAssignmentGroupIds.update((assignmentGroupIds) => {
      if (assignmentGroupIds.includes(assignmentGroupId)) {
        return assignmentGroupIds.filter((currentId) => currentId !== assignmentGroupId);
      }

      return [...assignmentGroupIds, assignmentGroupId];
    });
    this.emitScheduleEditorState();
  }

  protected closeScheduleEditor(assignmentGroupId: number): void {
    this.editingScheduleAssignmentGroupIds.update((assignmentGroupIds) =>
      assignmentGroupIds.filter((currentId) => currentId !== assignmentGroupId),
    );
    this.emitScheduleEditorState();
  }

  protected isEditingTeachers(assignmentGroupId: number): boolean {
    return this.editingTeacherAssignmentGroupIds().includes(assignmentGroupId);
  }

  protected isEditingSchedule(assignmentGroupId: number): boolean {
    return this.editingScheduleAssignmentGroupIds().includes(assignmentGroupId);
  }

  protected closeAllTeacherEditors(): void {
    if (!this.hasOpenTeacherEditors()) {
      return;
    }

    this.editingTeacherAssignmentGroupIds.set([]);
    this.emitTeacherEditorState();
  }

  protected closeAllScheduleEditors(): void {
    if (!this.hasOpenScheduleEditors()) {
      return;
    }

    this.editingScheduleAssignmentGroupIds.set([]);
    this.emitScheduleEditorState();
  }

  private closeFocusEditors(): void {
    const hasTeacherEditors = this.hasOpenTeacherEditors();
    const hasScheduleEditors = this.hasOpenScheduleEditors();

    if (!hasTeacherEditors && !hasScheduleEditors) {
      return;
    }

    if (hasTeacherEditors) {
      this.closeAllTeacherEditors();
    }

    if (hasScheduleEditors) {
      this.closeAllScheduleEditors();
    }
  }

  protected startGroupCreation(subject: StudyPlanAcademicAssignmentsGradeSubject): void {
    if (!subject.actions.add_group) {
      return;
    }

    this.creatingGroupSubjectId.set(subject.id);
    this.groupsExpanded.set(true);
  }

  protected closeGroupCreation(): void {
    this.creatingGroupSubjectId.set(null);
  }

  protected isCreatingGroup(subject: StudyPlanAcademicAssignmentsGradeSubject): boolean {
    return this.creatingGroupSubjectId() === subject.id;
  }

  protected groupTypeTranslation(group: StudyPlanAcademicAssignmentsGradeSubjectGroup): string {
    return group.type?.translation ?? group.type?.name ?? 'common.no-data';
  }

  protected subjectMetrics(subject: StudyPlanAcademicAssignmentsGradeSubject): DetailMetric[] {
    const metrics = [
      this.metric('teachers', 'user-check', 'teachers', subject.summary.teachers_count),
    ];

    if (subject.summary.schedule_required) {
      metrics.push(
        this.metric('schedules', 'calendar-check', 'schedules', subject.summary.schedules_count),
      );
    }

    if (subject.subject_type?.uses_teams) {
      metrics.push(this.metric('teams', 'layout-grid', 'teams', subject.summary.teams_count));
    }

    return metrics;
  }

  protected groupMetrics(
    subject: StudyPlanAcademicAssignmentsGradeSubject,
    group: StudyPlanAcademicAssignmentsGradeSubjectGroup,
  ): DetailMetric[] {
    const metrics = [
      this.metric('teachers', 'user-check', 'teachers', group.summary.teachers_count),
    ];

    if (group.summary.schedule_required) {
      metrics.push(
        this.metric('schedules', 'calendar-check', 'schedules', group.summary.schedules_count),
      );
    }

    if (group.summary.has_options) {
      metrics.push(this.metric('options', 'settings', 'options', group.summary.options_count));
    }

    return metrics;
  }

  protected statusIcon(status: ConfigurationStatus): string {
    return status === 'complete' ? 'check' : 'triangle-alert';
  }

  protected statusTone(status: ConfigurationStatus): 'success' | 'warning' {
    return status === 'complete' ? 'success' : 'warning';
  }

  protected subjectStatusTooltipKey(status: ConfigurationStatus): string {
    return status === 'complete'
      ? 'planning.study-plan-organizations.academic-assignments.status.complete'
      : 'planning.study-plan-organizations.academic-assignments.status.review';
  }

  protected groupConditionIcons(
    subject: StudyPlanAcademicAssignmentsGradeSubject,
    group: StudyPlanAcademicAssignmentsGradeSubjectGroup,
  ): GroupConditionIcon[] {
    const icons: GroupConditionIcon[] = [];

    if (!group.summary.has_teachers) {
      icons.push({
        key: 'teachers',
        icon: 'applicants',
        title: 'planning.study-plan-organizations.academic-assignments.without-teachers',
      });
    }

    if (group.summary.schedule_required && !group.summary.has_schedule) {
      icons.push({
        key: 'schedule',
        icon: 'calendar-clock',
        title: 'planning.study-plan-organizations.academic-assignments.without-schedule',
      });
    }

    return icons;
  }

  protected groupVisualStatusClasses(conditionIcons: GroupConditionIcon[]): string {
    return this.statusClasses(conditionIcons.length > 0 ? 'partial' : 'complete', true);
  }

  protected statusClasses(status: ConfigurationStatus, compact = false): string {
    return [
      'study-plan-academic-assignments-subject-card__status',
      `study-plan-academic-assignments-subject-card__status--${status}`,
      compact ? 'study-plan-academic-assignments-subject-card__status--compact' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  protected visibleTeachers(
    group: StudyPlanAcademicAssignmentsGradeSubjectGroup,
  ): StudyPlanAcademicAssignmentsGroupTeacher[] {
    return group.teachers.slice(0, this.visibleTeachersLimit);
  }

  protected hiddenTeachersCount(group: StudyPlanAcademicAssignmentsGradeSubjectGroup): number {
    return Math.max(0, group.teachers.length - this.visibleTeachersLimit);
  }

  protected teacherInitials(teacher: StudyPlanAcademicAssignmentsGroupTeacher): string {
    const initials = teacher.initials?.trim();

    if (initials) {
      return initials;
    }

    const nameParts = teacher.name?.trim().split(/\s+/).filter(Boolean) ?? [];

    if (nameParts.length === 0) {
      return '--';
    }

    return nameParts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  protected addGroupOption(
    subject: StudyPlanAcademicAssignmentsGradeSubject,
  ): ScreenOptionItem | null {
    if (!subject.actions.add_group) {
      return null;
    }

    return this.optionForAction('add_group');
  }

  protected groupActionOptions(
    group: StudyPlanAcademicAssignmentsGradeSubjectGroup,
  ): ScreenOptionItem[] {
    return this.enabledActionOptions(group.actions, [
      'remove_group',
      'manage_teachers',
      'assign_schedule',
      'manage_options',
    ]);
  }

  protected handleGroupActionClick(
    action: ScreenOptionItem,
    assignmentGroup: StudyPlanAcademicAssignmentsGradeSubjectGroup,
  ): void {
    const assignmentGroupId = assignmentGroup.id;

    if (action.name === 'manage-teachers') {
      this.editTeachers(assignmentGroupId);
      return;
    }

    if (action.name === 'manage-options') {
      this.editOptions(assignmentGroupId);
      return;
    }

    if (action.name === 'assign-schedule') {
      this.editSchedule(assignmentGroupId);
      return;
    }

    if (action.name === 'remove-group') {
      void this.confirmRemoveAssignmentGroup(this.subject(), assignmentGroup);
    }
  }

  protected assignSubject(subject: StudyPlanAcademicAssignmentsGradeSubject): void {
    void this.confirmAssignSubject(subject);
  }

  protected manageTeamsForSubject(subject: StudyPlanAcademicAssignmentsGradeSubject): void {
    this.manageTeamsRequested.emit(subject);
  }

  protected handleTeachersSaved(
    group: StudyPlanAcademicAssignmentsGradeSubjectGroup,
    payload: SubjectGroupTeacherAssignmentSavedPayload,
  ): void {
    group.teachers = payload.teachers;
    group.summary = payload.group_summary;
    this.subject().summary = payload.subject_summary;
    this.assignmentMutation.emit({
      subject_summary: payload.subject_summary,
      grade_summary: payload.grade_summary,
      organization_summaries: payload.organization_summaries,
    });
    this.closeTeacherEditor(group.id);
  }

  protected handleOptionsSaved(
    group: StudyPlanAcademicAssignmentsGradeSubjectGroup,
    payload: SubjectGroupOptionsSavedPayload,
  ): void {
    group.grade_capture_enabled = payload.grade_capture_enabled;
    group.report_card_official_override = payload.report_card_official_override;
    group.summary = payload.group_summary;
    this.subject().summary = payload.subject_summary;
    this.assignmentMutation.emit({
      subject_summary: payload.subject_summary,
      grade_summary: payload.grade_summary,
      organization_summaries: payload.organization_summaries,
    });
    this.closeOptionsEditor();
  }

  protected handleScheduleMutation(
    group: StudyPlanAcademicAssignmentsGradeSubjectGroup,
    payload: ScheduleCellMutationResponseDto,
  ): void {
    group.summary = payload.group_summary;
    this.subject().summary = payload.subject_summary;
    this.assignmentMutation.emit({
      subject_summary: payload.subject_summary,
      grade_summary: payload.grade_summary,
      organization_summaries: payload.organization_summaries,
    });
  }

  protected handleGroupCreated(
    subject: StudyPlanAcademicAssignmentsGradeSubject,
    payload: SubjectGroupCreationResponse,
  ): void {
    subject.groups = [...subject.groups, payload.group];
    subject.summary = payload.subject_summary;
    this.assignmentMutation.emit(payload);
    this.groupsExpanded.set(true);
    this.closeGroupCreation();
  }

  private async confirmAssignSubject(
    subject: StudyPlanAcademicAssignmentsGradeSubject,
  ): Promise<void> {
    if (!this.assignSubjectRoute(subject) || !this.assignSubjectOption()) {
      return;
    }

    const confirmed = await this.modal.open<ISklConfirmModalData, boolean>({
      component: SklConfirmModal,
      title: this.translate.instant(
        'planning.study-plan-organizations.academic-assignments.assign-subject.confirm-title',
      ),
      data: {
        message: this.translate.instant(
          'planning.study-plan-organizations.academic-assignments.assign-subject.confirm-message',
          {
            subject: this.subjectLabel(subject),
          },
        ),
        confirmLabel: this.translate.instant(
          'planning.study-plan-organizations.academic-assignments.assign-subject.confirm-accept',
        ),
        cancelLabel: this.translate.instant(
          'planning.study-plan-organizations.academic-assignments.assign-subject.confirm-cancel',
        ),
        type: 'info',
      },
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (confirmed !== true) {
      return;
    }

    this.executeAssignSubject(subject);
  }

  private executeAssignSubject(subject: StudyPlanAcademicAssignmentsGradeSubject): void {
    const route = this.assignSubjectRoute(subject);
    const gradeId = this.gradeId();

    if (!route || gradeId === null) {
      return;
    }

    this.executeMutationRequest<StudyPlanAcademicAssignmentsSubjectAssignedMutation>(
      this.api.post(route, {
        grade_id: gradeId,
      }),
      (res) => this.subjectAssigned.emit(res.data),
    );
  }

  private async confirmRemoveAssignmentGroup(
    subject: StudyPlanAcademicAssignmentsGradeSubject,
    assignmentGroup: StudyPlanAcademicAssignmentsGradeSubjectGroup,
  ): Promise<void> {
    const confirmed = await this.modal.open<ISklConfirmModalData, boolean>({
      component: SklConfirmModal,
      title: this.translate.instant(
        'planning.study-plan-organizations.academic-assignments.remove-group.confirm-title',
      ),
      data: {
        message: this.translate.instant(
          'planning.study-plan-organizations.academic-assignments.remove-group.confirm-message',
          {
            group: this.assignmentGroupLabel(assignmentGroup),
            subject: this.subjectLabel(subject),
          },
        ),
        confirmLabel: this.translate.instant(
          'planning.study-plan-organizations.academic-assignments.remove-group.confirm-accept',
        ),
        cancelLabel: this.translate.instant(
          'planning.study-plan-organizations.academic-assignments.remove-group.confirm-cancel',
        ),
        type: 'danger',
      },
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (confirmed !== true) {
      return;
    }

    this.removeAssignmentGroup(subject, assignmentGroup.id);
  }

  private removeAssignmentGroup(
    subject: StudyPlanAcademicAssignmentsGradeSubject,
    assignmentGroupId: number,
  ): void {
    const route = this.removeAssignmentGroupRoute(assignmentGroupId);

    if (!route) {
      return;
    }

    this.executeSilentRequest<RemoveAssignmentGroupResponse>(this.api.delete(route), (res) => {
      const removedAssignmentGroupId = res.data.assignment_group_id;

      subject.groups = subject.groups.filter((group) => group.id !== removedAssignmentGroupId);
      subject.summary = res.data.subject_summary;
      this.assignmentMutation.emit(res.data);

      this.closeTeacherEditor(removedAssignmentGroupId);

      if (this.editingOptionsAssignmentGroupId() === removedAssignmentGroupId) {
        this.closeOptionsEditor();
      }

      this.closeScheduleEditor(removedAssignmentGroupId);

      this.toast.success(
        this.translate.instant(
          'planning.study-plan-organizations.academic-assignments.remove-group.success',
        ),
      );
    });
  }

  private assignSubjectRoute(subject: StudyPlanAcademicAssignmentsGradeSubject): string | null {
    const baseRoute = this.route().trim();
    const stageId = this.stageId();
    const gradeId = this.gradeId();

    if (!baseRoute || !stageId || !subject.id || gradeId === null) {
      return null;
    }

    return `${baseRoute}/${stageId}/${subject.id}/assign-subject`;
  }

  private removeAssignmentGroupRoute(assignmentGroupId: number): string | null {
    const baseRoute = this.route().trim();
    const stageId = this.stageId();

    if (!baseRoute || !stageId || !assignmentGroupId) {
      return null;
    }

    const route = `${baseRoute}/${stageId}/${assignmentGroupId}`;
    const gradeId = this.gradeId();

    if (gradeId === null) {
      return route;
    }

    return `${route}?grade_id=${encodeURIComponent(String(gradeId))}`;
  }

  private assignmentGroupLabel(group: StudyPlanAcademicAssignmentsGradeSubjectGroup): string {
    return group.name?.trim() || group.code?.trim() || this.translate.instant('common.no-data');
  }

  private subjectLabel(subject: StudyPlanAcademicAssignmentsGradeSubject): string {
    return subject.name?.trim() || subject.code?.trim() || this.translate.instant('common.no-data');
  }

  private metric(key: string, icon: string, label: string, value: number): DetailMetric {
    return {
      key,
      icon,
      label: `planning.study-plan-organizations.academic-assignments.metrics.${label}`,
      value,
    };
  }

  private enabledActionOptions(
    actions: Partial<Record<GroupActionKey, boolean>>,
    keys: GroupActionKey[],
  ): ScreenOptionItem[] {
    return keys
      .filter((key) => actions[key])
      .map((key) => this.optionForAction(key))
      .filter((option): option is ScreenOptionItem => option !== null);
  }

  private optionForAction(key: SubjectActionKey | GroupActionKey): ScreenOptionItem | null {
    return this.optionByName().get(key.replaceAll('_', '-')) ?? null;
  }

  private emitTeacherEditorState(): void {
    this.teacherEditorStateChange.emit(this.hasOpenTeacherEditors());
  }

  private emitScheduleEditorState(): void {
    this.scheduleEditorStateChange.emit(this.hasOpenScheduleEditors());
  }
}
