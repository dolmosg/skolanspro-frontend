import { Component, computed, effect, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import type {
  StudyPlanAcademicAssignmentsGradeSummary,
  StudyPlanAcademicAssignmentsGroupSummary,
  StudyPlanAcademicAssignmentsSubjectSummary,
} from '../study-plan-academic-assignments-grade-detail/study-plan-academic-assignments-grade-detail.component';
import type { StudyPlanOrganizationSummariesPatch } from '../../study-plan-organization.component';

interface SubjectGroupTeacherAssignmentTeacher {
  id: number;
  full: string;
  full_name: string;
  photo: string | null;
}

export interface SubjectGroupAssignedTeacher {
  id: number;
  name: string | null;
  initials?: string | null;
  photo?: string | null;
  active: boolean;
}

interface SubjectGroupTeacherAssignmentResponse {
  teachers: SubjectGroupTeacherAssignmentTeacher[];
}

export interface SubjectGroupTeacherAssignmentSavedPayload {
  teachers: SubjectGroupAssignedTeacher[];
  summary: StudyPlanAcademicAssignmentsGroupSummary;
  group_summary: StudyPlanAcademicAssignmentsGroupSummary;
  subject_summary: StudyPlanAcademicAssignmentsSubjectSummary;
  grade_summary: StudyPlanAcademicAssignmentsGradeSummary;
  organization_summaries: StudyPlanOrganizationSummariesPatch;
}

@Component({
  selector: 'app-subject-group-teacher-assignment',
  imports: [TranslatePipe, UiButtonComponent],
  templateUrl: './subject-group-teacher-assignment.component.html',
  styleUrl: './subject-group-teacher-assignment.component.scss',
})
export class SubjectGroupTeacherAssignmentComponent extends SkolansBaseComponent {
  readonly route = input.required<string>();
  readonly stageId = input.required<number>();
  readonly gradeId = input<number | null>(null);
  readonly assignmentGroupId = input.required<number>();
  readonly assignedTeachers = input<SubjectGroupAssignedTeacher[]>([]);
  readonly close = output<void>();
  readonly saved = output<SubjectGroupTeacherAssignmentSavedPayload>();

  protected readonly availableTeachers = signal<SubjectGroupTeacherAssignmentTeacher[]>([]);
  protected readonly selectedTeachers = signal<SubjectGroupTeacherAssignmentTeacher[]>([]);
  protected readonly initialTeacherIds = signal<number[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly hasChanges = computed(() => {
    return this.teacherIdsKey(this.selectedTeachers()) !== this.initialTeacherIds().join(',');
  });
  protected readonly filteredAvailableTeachers = computed(() => {
    const term = this.normalizeSearchText(this.searchTerm());
    const teachers = this.availableTeachers();

    if (!term) {
      return teachers;
    }

    return teachers.filter((teacher) =>
      this.normalizeSearchText(this.teacherName(teacher)).includes(term),
    );
  });

  private readonly loadedKey = signal<string | null>(null);

  constructor() {
    super();

    effect(() => {
      const route = this.availableTeachersRoute();

      if (!route) {
        this.resetState();
        return;
      }

      if (this.loadedKey() === route) {
        return;
      }

      this.loadedKey.set(route);
      this.searchTerm.set('');
      this.availableTeachers.set([]);
      this.initializeSelectedTeachers();
      this.loadAvailableTeachers(route);
    });
  }

  protected updateSearchTerm(event: Event): void {
    const inputElement = event.target as HTMLInputElement | null;

    this.searchTerm.set(inputElement?.value ?? '');
  }

  protected addTeacher(teacher: SubjectGroupTeacherAssignmentTeacher): void {
    if (this.selectedTeachers().some((selectedTeacher) => selectedTeacher.id === teacher.id)) {
      return;
    }

    this.availableTeachers.update((teachers) =>
      teachers.filter((availableTeacher) => availableTeacher.id !== teacher.id),
    );
    this.selectedTeachers.update((teachers) => this.sortTeachers([...teachers, teacher]));
  }

  protected removeTeacher(teacher: SubjectGroupTeacherAssignmentTeacher): void {
    this.selectedTeachers.update((teachers) =>
      teachers.filter((selectedTeacher) => selectedTeacher.id !== teacher.id),
    );
    this.availableTeachers.update((teachers) => {
      if (teachers.some((availableTeacher) => availableTeacher.id === teacher.id)) {
        return teachers;
      }

      return this.sortTeachers([...teachers, teacher]);
    });
  }

  protected teacherName(teacher: SubjectGroupTeacherAssignmentTeacher): string {
    return teacher.full_name?.trim() || teacher.full?.trim() || '';
  }

  protected teacherInitial(teacher: SubjectGroupTeacherAssignmentTeacher): string {
    return this.teacherName(teacher).charAt(0).toUpperCase() || '--';
  }

  protected saveChanges(): void {
    const route = this.saveTeachersRoute();

    if (!route || !this.hasChanges()) {
      return;
    }

    this.executeMutationRequest<SubjectGroupTeacherAssignmentSavedPayload>(
      this.api.put(route, this.savePayload()),
      (res) => {
        this.initialTeacherIds.set(this.sortedTeacherIds(this.selectedTeachers()));
        this.saved.emit(res.data);
      },
    );
  }

  protected closeEditor(): void {
    if (this.loading()) {
      return;
    }

    this.close.emit();
  }

  private loadAvailableTeachers(route: string): void {
    this.executeSilentRequest<SubjectGroupTeacherAssignmentResponse>(
      this.api.get(route),
      (res) => {
        if (this.loadedKey() !== route) {
          return;
        }

        this.availableTeachers.set(this.excludeSelectedTeachers(res.data.teachers ?? []));
      },
      () => {
        if (this.loadedKey() !== route) {
          return;
        }

        this.availableTeachers.set([]);
      },
    );
  }

  private availableTeachersRoute(): string | null {
    const baseRoute = this.route().trim();
    const stageId = this.stageId();
    const assignmentGroupId = this.assignmentGroupId();

    if (!baseRoute || !stageId || !assignmentGroupId) {
      return null;
    }

    const route = `${baseRoute}/${stageId}/${assignmentGroupId}/available-teachers`;
    const gradeId = this.gradeId();

    if (gradeId === null) {
      return route;
    }

    return `${route}?grade_id=${encodeURIComponent(String(gradeId))}`;
  }

  private saveTeachersRoute(): string | null {
    const baseRoute = this.route().trim();
    const stageId = this.stageId();
    const assignmentGroupId = this.assignmentGroupId();

    if (!baseRoute || !stageId || !assignmentGroupId) {
      return null;
    }

    return `${baseRoute}/${stageId}/${assignmentGroupId}/teachers`;
  }

  private savePayload(): { teacher_ids: number[]; grade_id?: number } {
    const payload: { teacher_ids: number[]; grade_id?: number } = {
      teacher_ids: this.sortedTeacherIds(this.selectedTeachers()),
    };
    const gradeId = this.gradeId();

    if (gradeId !== null) {
      payload.grade_id = gradeId;
    }

    return payload;
  }

  private resetState(): void {
    this.loadedKey.set(null);
    this.searchTerm.set('');
    this.availableTeachers.set([]);
    this.selectedTeachers.set([]);
    this.initialTeacherIds.set([]);
  }

  private initializeSelectedTeachers(): void {
    const selectedTeachers = this.assignedTeachers().map((teacher) =>
      this.normalizeAssignedTeacher(teacher),
    );

    this.selectedTeachers.set(this.sortTeachers(selectedTeachers));
    this.initialTeacherIds.set(this.sortedTeacherIds(selectedTeachers));
  }

  private normalizeAssignedTeacher(
    teacher: SubjectGroupAssignedTeacher,
  ): SubjectGroupTeacherAssignmentTeacher {
    const name = teacher.name?.trim() ?? '';

    return {
      id: teacher.id,
      full: name,
      full_name: name,
      photo: teacher.photo ?? null,
    };
  }

  private excludeSelectedTeachers(
    teachers: SubjectGroupTeacherAssignmentTeacher[],
  ): SubjectGroupTeacherAssignmentTeacher[] {
    const selectedTeacherIds = new Set(this.selectedTeachers().map((teacher) => teacher.id));

    return this.sortTeachers(teachers.filter((teacher) => !selectedTeacherIds.has(teacher.id)));
  }

  private sortTeachers(
    teachers: SubjectGroupTeacherAssignmentTeacher[],
  ): SubjectGroupTeacherAssignmentTeacher[] {
    return [...teachers].sort((firstTeacher, secondTeacher) =>
      this.teacherName(firstTeacher).localeCompare(this.teacherName(secondTeacher), undefined, {
        sensitivity: 'base',
      }),
    );
  }

  private sortedTeacherIds(teachers: SubjectGroupTeacherAssignmentTeacher[]): number[] {
    return teachers
      .map((teacher) => teacher.id)
      .sort((firstId, secondId) => firstId - secondId);
  }

  private teacherIdsKey(teachers: SubjectGroupTeacherAssignmentTeacher[]): string {
    return this.sortedTeacherIds(teachers).join(',');
  }

  private normalizeSearchText(value: string | null | undefined): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase();
  }
}
