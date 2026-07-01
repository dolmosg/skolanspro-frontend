import { Component, computed, effect, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import { IStudyPlanStageSubject } from '../study-plan-subjects.interfaces';
import type { IStudyPlanStage as IStudyPlanAcademicsStage } from '../../study-plan-academics.component';

export interface AvailableStudyPlanSubject {
  id: number;
  code?: string | null;
  name: string;
  short_name?: string | null;
  grade_id: number | null;
  learning_area_id?: number | null;
  subject_classification_id?: number | null;
  order?: number | null;
}

interface AvailableStudyPlanSubjectsResponse {
  available_subjects?: AvailableStudyPlanSubject[];
}

export interface AssignedStudyPlanSubjectsResponse {
  subjects?: IStudyPlanStageSubject[];
  academics_stage?: IStudyPlanAcademicsStage | null;
}

@Component({
  selector: 'app-stage-subject-assignment',
  standalone: true,
  imports: [TranslatePipe, UiButtonComponent, UiIconComponent],
  templateUrl: './stage-subject-assignment.component.html',
  styleUrl: './stage-subject-assignment.component.scss',
})
export class StageSubjectAssignmentComponent extends SkolansBaseComponent {
  readonly stageId = input<number | null>(null);
  readonly gradeId = input<number | null>(null);
  readonly route = input<string | null>(null);
  readonly title = input<string>('');
  readonly subtitle = input<string>('');

  readonly assigned = output<AssignedStudyPlanSubjectsResponse>();
  readonly cancel = output<void>();

  protected readonly availableSubjects = signal<AvailableStudyPlanSubject[]>([]);
  protected readonly selectedSubjectIds = signal<number[]>([]);
  protected readonly search = signal('');

  protected readonly filteredSubjects = computed(() => {
    const term = this.normalizeSearch(this.search());

    if (!term) {
      return this.availableSubjects();
    }

    return this.availableSubjects().filter((subject) => {
      return (
        this.normalizeSearch(subject.code ?? '').includes(term) ||
        this.normalizeSearch(subject.name).includes(term) ||
        this.normalizeSearch(subject.short_name ?? '').includes(term)
      );
    });
  });

  protected readonly selectedCount = computed(() => this.selectedSubjectIds().length);
  protected readonly hasAvailableSubjects = computed(() => this.availableSubjects().length > 0);
  protected readonly hasFilteredSubjects = computed(() => this.filteredSubjects().length > 0);
  protected readonly hasActiveSearch = computed(() => this.normalizeSearch(this.search()).length > 0);
  protected readonly canAssign = computed(() => this.selectedCount() > 0);
  protected readonly isCrossoverMode = computed(() => this.gradeId() === null);

  constructor() {
    super();

    effect(() => {
      const route = this.route();
      const stageId = this.stageId();
      const gradeId = this.gradeId();

      if (!route || !stageId) {
        this.availableSubjects.set([]);
        this.selectedSubjectIds.set([]);
        return;
      }

      this.loadAvailableSubjects(route, stageId, gradeId);
    });

    effect(() => {
      this.setAssignmentAssistantContext();
    });
  }

  protected updateSearch(value: string): void {
    this.search.set(value);
  }

  protected clearSearch(): void {
    this.search.set('');
  }

  protected isSelected(subjectId: number): boolean {
    return this.selectedSubjectIds().includes(subjectId);
  }

  protected toggleSubject(subjectId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const selected = this.selectedSubjectIds();

    this.selectedSubjectIds.set(
      checked
        ? Array.from(new Set([...selected, subjectId]))
        : selected.filter((id) => id !== subjectId),
    );
  }

  protected subjectLabel(subject: AvailableStudyPlanSubject): string {
    return subject.name || subject.short_name || subject.code || '';
  }

  protected subjectMeta(subject: AvailableStudyPlanSubject): string {
    return [subject.code, subject.short_name]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .join(' | ');
  }

  protected assignSubjects(): void {
    const route = this.route();
    const stageId = this.stageId();

    if (!route || !stageId || !this.canAssign()) {
      return;
    }

    this.executeMutationRequest<AssignedStudyPlanSubjectsResponse>(
      this.api.post(`${route}/${stageId}/assign-subjects`, {
        grade_id: this.gradeId(),
        subject_ids: this.selectedSubjectIds(),
      }),
      (res) => {
        this.assigned.emit(res.data);
      },
    );
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  private loadAvailableSubjects(route: string, stageId: number, gradeId: number | null): void {
    const gradeQuery = gradeId === null ? '' : String(gradeId);

    this.selectedSubjectIds.set([]);
    this.search.set('');

    this.executeSilentRequest<AvailableStudyPlanSubjectsResponse>(
      this.api.get(`${route}/${stageId}/available-subjects?grade_id=${encodeURIComponent(gradeQuery)}`),
      (res) => {
        this.availableSubjects.set(res.data.available_subjects ?? []);
      },
      () => {
        this.availableSubjects.set([]);
      },
    );
  }

  private setAssignmentAssistantContext(): void {
    const stageId = this.stageId();

    if (!stageId) {
      return;
    }

    this.setAssistantContext({
      contextType: 'editor',
      contextId: 'planning.study-plans.academics.subjects',
      feature: 'study-plans',
      title: this.title(),
      subtitle: this.subtitle(),
      entity: 'StudyPlanStageSubject',
      mode: 'adding-subjects',
      data: {
        stageId,
        stageName: this.subtitle(),
        gradeId: this.gradeId(),
        gradeName: this.isCrossoverMode() ? null : this.title(),
        isCrossoverMode: this.isCrossoverMode(),
        availableSubjectsCount: this.availableSubjects().length,
        visibleSubjectsCount: this.filteredSubjects().length,
        selectedSubjectIds: this.selectedSubjectIds(),
        selectedSubjectsCount: this.selectedCount(),
        currentSearch: this.search(),
        hasActiveSearch: this.hasActiveSearch(),
        availableActions: ['assign-subjects', 'cancel'],
      },
    });
  }

  private normalizeSearch(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
