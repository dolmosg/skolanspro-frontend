import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, OnInit, computed, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';
import { UiDrawerComponent } from '@shared/ui/ui-drawer/ui-drawer';
import {
  UiSelectionListComponent,
  type UiSelectionId,
  type UiSelectionItem,
} from '@shared/ui/ui-selection-list/ui-selection-list';

import type { StudyPlanReportCardItemDto } from '../../study-plan-report-cards.interfaces';
import type {
  GradebookSubjectContext,
  GradebookSubjectCandidateDto,
  GradebookSubjectCandidatesResponse,
  GradebookSubjectItemDto,
  GradebookSubjectsStoreResponse,
  GradebookSubjectsGradeDto,
  GradebookSubjectsResponse,
  GradebookSubjectsStageDto,
} from './gradebook-subjects.interfaces';

@Component({
  selector: 'app-gradebook-subjects',
  imports: [
    DragDropModule,
    TranslatePipe,
    UiButtonComponent,
    UiIconComponent,
    UiDrawerComponent,
    UiSelectionListComponent,
  ],
  templateUrl: './gradebook-subjects.component.html',
  styleUrl: './gradebook-subjects.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradebookSubjectsComponent extends SkolansBaseComponent implements OnInit {
  readonly gradebook = input.required<StudyPlanReportCardItemDto>();
  readonly studyPlanId = input.required<number>();
  readonly route = input.required<string>();

  protected readonly stage = signal<GradebookSubjectsStageDto | null>(null);
  protected readonly grades = signal<GradebookSubjectsGradeDto[]>([]);
  protected readonly subjects = signal<GradebookSubjectItemDto[]>([]);
  protected readonly selectedContext = signal<GradebookSubjectContext | null>(null);
  protected readonly loaded = signal(false);
  protected readonly addPanelOpen = signal(false);
  protected readonly candidates = signal<GradebookSubjectCandidateDto[]>([]);
  protected readonly selectedCandidateIds = signal<Set<number>>(new Set());
  protected readonly candidatesLoading = signal(false);
  protected readonly addSaving = signal(false);
  protected readonly orderSaving = signal(false);
  protected readonly deletingSubjectId = signal<number | null>(null);

  private candidatesRequestSequence = 0;

  protected readonly selectedGrade = computed(() => {
    const context = this.selectedContext();

    if (context?.type !== 'grade') {
      return null;
    }

    return this.grades().find((grade) => grade.id === context.gradeId) ?? null;
  });

  protected readonly visibleSubjects = computed(() => {
    const context = this.selectedContext();

    if (!context) {
      return [];
    }

    return this.subjects().filter((item) => {
      return context.type === 'crossovers'
        ? item.grade_id === null
        : item.grade_id === context.gradeId;
    });
  });

  protected readonly selectedCandidatesCount = computed(() => this.selectedCandidateIds().size);
  protected readonly candidateItems = computed<UiSelectionItem[]>(() =>
    this.candidates().map((candidate) => ({
      id: candidate.stage_subject_id,
      code: candidate.subject.code ?? undefined,
      name: candidate.subject.name,
    })),
  );

  ngOnInit(): void {
    this.loadSubjects();
  }

  protected selectGrade(gradeId: number): void {
    if (this.addSaving() || this.orderSaving() || this.deletingSubjectId() !== null) {
      return;
    }

    this.closeAddPanel();
    this.selectedContext.set({ type: 'grade', gradeId });
  }

  protected selectCrossovers(): void {
    if (this.addSaving() || this.orderSaving() || this.deletingSubjectId() !== null) {
      return;
    }

    this.closeAddPanel();
    this.selectedContext.set({ type: 'crossovers' });
  }

  protected isSelectedGrade(gradeId: number): boolean {
    const context = this.selectedContext();

    return context?.type === 'grade' && context.gradeId === gradeId;
  }

  protected isSelectedCrossovers(): boolean {
    const context = this.selectedContext();

    return context?.type === 'crossovers';
  }

  protected openAddPanel(): void {
    const context = this.selectedContext();

    if (!context || this.orderSaving() || this.deletingSubjectId() !== null) {
      return;
    }

    this.selectedCandidateIds.set(new Set());
    this.candidates.set([]);
    this.addPanelOpen.set(true);
    this.loadCandidates(context);
  }

  protected closeAddPanel(): void {
    if (this.addSaving()) {
      return;
    }

    this.candidatesRequestSequence++;
    this.addPanelOpen.set(false);
    this.candidatesLoading.set(false);
    this.candidates.set([]);
    this.selectedCandidateIds.set(new Set());
  }

  protected onCandidateSelectionChange({ id, checked }: { id: UiSelectionId; checked: boolean }): void {
    if (typeof id !== 'number') {
      return;
    }

    this.selectedCandidateIds.update((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }

      return next;
    });
  }

  protected addSubjects(): void {
    const stageSubjectIds = Array.from(this.selectedCandidateIds());

    if (
      stageSubjectIds.length === 0 ||
      this.addSaving() ||
      this.orderSaving() ||
      this.deletingSubjectId() !== null
    ) {
      return;
    }

    this.addSaving.set(true);

    this.executeMutationRequest<GradebookSubjectsStoreResponse>(
      this.api.post(`${this.route()}/${this.studyPlanId()}/${this.gradebook().id}`, {
        stage_subject_ids: stageSubjectIds,
      }),
      (response) => {
        this.subjects.set(response.data.subjects);
        this.addSaving.set(false);
        this.closeAddPanel();
      },
      () => this.addSaving.set(false),
    );
  }

  protected onSubjectsDropped(event: CdkDragDrop<GradebookSubjectItemDto[]>): void {
    if (
      !this.getScreenOption('order') ||
      this.addSaving() ||
      this.orderSaving() ||
      this.deletingSubjectId() !== null
    ) {
      return;
    }

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const previousSubjects = this.subjects();
    const reorderedSubjects = [...this.visibleSubjects()];

    moveItemInArray(reorderedSubjects, event.previousIndex, event.currentIndex);

    const reorderedById = new Map(
      reorderedSubjects.map((subject, order) => [subject.id, { ...subject, order }]),
    );

    this.subjects.set(previousSubjects.map((subject) => reorderedById.get(subject.id) ?? subject));
    this.orderSaving.set(true);

    const rollback = (): void => this.subjects.set(previousSubjects);

    this.request(
      this.api.put<GradebookSubjectsStoreResponse>(
        `${this.route()}/${this.studyPlanId()}/${this.gradebook().id}/order`,
        { gradebook_subject_ids: reorderedSubjects.map((subject) => subject.id) },
        { loader: false },
      ),
      () => this.orderSaving.set(false),
    ).subscribe({
      next: (response) => {
        if (this.handleApiFailure(response)) {
          rollback();
          return;
        }

        this.handleApiSuccess(response);
        this.subjects.set(response.data.subjects);
      },
      error: () => {
        rollback();
        this.ignoreHandledRequestError();
      },
    });
  }

  protected async deleteSubject(subject: GradebookSubjectItemDto): Promise<void> {
    if (
      !this.getScreenOption('delete') ||
      this.addSaving() ||
      this.orderSaving() ||
      this.deletingSubjectId() !== null
    ) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'planning.study-plan-report-card-subjects.delete',
      'planning.study-plan-report-card-subjects.messages.confirm-delete',
    );

    if (!confirmed || this.addSaving() || this.orderSaving() || this.deletingSubjectId() !== null) {
      return;
    }

    this.deletingSubjectId.set(subject.id);

    this.executeMutationRequest<GradebookSubjectsStoreResponse>(
      this.api.delete(`${this.route()}/${this.studyPlanId()}/${this.gradebook().id}/${subject.id}`),
      (response) => this.subjects.set(response.data.subjects),
      () => this.deletingSubjectId.set(null),
    );
  }

  private loadSubjects(): void {
    this.loaded.set(false);

    this.executeSilentRequest<GradebookSubjectsResponse>(
      this.api.get(`${this.route()}/${this.studyPlanId()}/${this.gradebook().id}`),
      (response) => {
        this.stage.set(response.data.stage);
        this.grades.set(response.data.grades);
        this.subjects.set(response.data.subjects);
        this.setScreenOptions(response.data.options);
        this.selectInitialContext(response.data.grades, response.data.stage);
        this.loaded.set(true);
      },
    );
  }

  private loadCandidates(context: GradebookSubjectContext): void {
    const requestSequence = ++this.candidatesRequestSequence;
    const route = `${this.route()}/${this.studyPlanId()}/${this.gradebook().id}/candidates`;
    const query =
      context.type === 'grade'
        ? `mode=grade&grade_id=${encodeURIComponent(String(context.gradeId))}`
        : 'mode=crossover';

    this.candidatesLoading.set(true);

    this.executeSilentRequest<GradebookSubjectCandidatesResponse>(
      this.api.get(`${route}?${query}`, { loader: false }),
      (response) => {
        if (requestSequence !== this.candidatesRequestSequence || !this.addPanelOpen()) {
          return;
        }

        this.candidates.set(response.data.candidates);
      },
      () => {
        if (requestSequence === this.candidatesRequestSequence) {
          this.candidates.set([]);
        }
      },
      () => {
        if (requestSequence === this.candidatesRequestSequence) {
          this.candidatesLoading.set(false);
        }
      },
    );
  }

  private selectInitialContext(
    grades: GradebookSubjectsGradeDto[],
    stage: GradebookSubjectsStageDto,
  ): void {
    const firstGrade = grades[0];

    if (firstGrade) {
      this.selectGrade(firstGrade.id);
      return;
    }

    this.selectedContext.set(stage.has_crossovers ? { type: 'crossovers' } : null);
  }
}
