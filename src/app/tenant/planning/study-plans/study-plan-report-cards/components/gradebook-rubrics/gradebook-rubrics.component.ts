import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, OnInit, computed, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiDrawerComponent } from '@shared/ui/ui-drawer/ui-drawer';
import {
  UiSelectionListComponent,
  type UiSelectionId,
  type UiSelectionItem,
} from '@shared/ui/ui-selection-list/ui-selection-list';
import type { StudyPlanReportCardItemDto } from '../../study-plan-report-cards.interfaces';
import type {
  GradebookRubricsGradeDto,
  GradebookRubricItemDto,
  GradebookRubricsResponse,
  GradebookRubricCandidateDto,
  GradebookRubricCandidatesResponse,
  GradebookRubricsStoreResponse,
} from './gradebook-rubrics.interfaces';

@Component({
  selector: 'app-gradebook-rubrics',
  imports: [
    DragDropModule,
    TranslatePipe,
    UiIconComponent,
    UiButtonComponent,
    UiDrawerComponent,
    UiSelectionListComponent,
  ],
  templateUrl: './gradebook-rubrics.component.html',
  styleUrl: './gradebook-rubrics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradebookRubricsComponent extends SkolansBaseComponent implements OnInit {
  readonly gradebook = input.required<StudyPlanReportCardItemDto>();
  readonly studyPlanId = input.required<number>();
  readonly route = input.required<string>();
  protected readonly grades = signal<GradebookRubricsGradeDto[]>([]);
  protected readonly rubrics = signal<GradebookRubricItemDto[]>([]);
  protected readonly selectedGradeId = signal<number | null>(null);
  protected readonly loaded = signal(false);
  protected readonly addPanelOpen = signal(false);
  protected readonly candidates = signal<GradebookRubricCandidateDto[]>([]);
  protected readonly selectedCandidateIds = signal<Set<number>>(new Set());
  protected readonly candidatesLoading = signal(false);
  protected readonly addSaving = signal(false);
  protected readonly orderSaving = signal(false);
  protected readonly deletingRubricId = signal<number | null>(null);
  protected readonly visibleRubrics = computed(() =>
    this.rubrics().filter((rubric) => rubric.grade_id === this.selectedGradeId()),
  );
  protected readonly selectedGrade = computed(
    () => this.grades().find((grade) => grade.id === this.selectedGradeId()) ?? null,
  );
  protected readonly selectedCandidatesCount = computed(() => this.selectedCandidateIds().size);
  protected readonly candidateItems = computed<UiSelectionItem[]>(() =>
    this.candidates().map((candidate) => ({ id: candidate.id, name: candidate.name })),
  );
  private candidatesRequestSequence = 0;
  ngOnInit(): void {
    this.loadRubrics();
  }
  protected selectGrade(gradeId: number): void {
    if (this.addSaving() || this.orderSaving() || this.deletingRubricId() !== null) {
      return;
    }

    this.closeAddPanel();
    this.selectedGradeId.set(gradeId);
  }
  protected isSelectedGrade(gradeId: number): boolean {
    return this.selectedGradeId() === gradeId;
  }
  protected openAddPanel(): void {
    const gradeId = this.selectedGradeId();
    if (gradeId === null || this.orderSaving() || this.deletingRubricId() !== null) return;
    this.selectedCandidateIds.set(new Set());
    this.candidates.set([]);
    this.addPanelOpen.set(true);
    this.loadCandidates(gradeId);
  }
  protected closeAddPanel(): void {
    if (this.addSaving()) return;
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
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }
  protected addRubrics(): void {
    const rubricIds = Array.from(this.selectedCandidateIds());
    if (!rubricIds.length || this.addSaving() || this.orderSaving() || this.deletingRubricId() !== null) return;
    this.addSaving.set(true);
    this.executeMutationRequest<GradebookRubricsStoreResponse>(
      this.api.post(`${this.route()}/${this.studyPlanId()}/${this.gradebook().id}`, {
        rubric_ids: rubricIds,
      }),
      (response) => {
        this.rubrics.set(response.data.rubrics);
        this.addSaving.set(false);
        this.closeAddPanel();
      },
      () => this.addSaving.set(false),
    );
  }

  protected async deleteRubric(rubric: GradebookRubricItemDto): Promise<void> {
    if (
      !this.getScreenOption('delete') ||
      this.addSaving() ||
      this.orderSaving() ||
      this.deletingRubricId() !== null
    ) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'planning.study-plan-report-card-rubrics.delete',
      'planning.study-plan-report-card-rubrics.messages.confirm-delete',
      { name: rubric.rubric.name },
    );

    if (
      !confirmed ||
      this.addSaving() ||
      this.orderSaving() ||
      this.deletingRubricId() !== null
    ) {
      return;
    }

    this.deletingRubricId.set(rubric.id);

    this.executeMutationRequest<GradebookRubricsStoreResponse>(
      this.api.delete(`${this.route()}/${this.studyPlanId()}/${this.gradebook().id}/${rubric.id}`),
      (response) => this.rubrics.set(response.data.rubrics),
      () => this.deletingRubricId.set(null),
    );
  }

  protected onRubricsDropped(event: CdkDragDrop<GradebookRubricItemDto[]>): void {
    if (
      !this.getScreenOption('order') ||
      this.addPanelOpen() ||
      this.addSaving() ||
      this.orderSaving() ||
      this.deletingRubricId() !== null
    ) {
      return;
    }

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const previousRubrics = this.rubrics();
    const reorderedRubrics = [...this.visibleRubrics()];

    moveItemInArray(reorderedRubrics, event.previousIndex, event.currentIndex);

    const reorderedById = new Map(
      reorderedRubrics.map((rubric, order) => [rubric.id, { ...rubric, order }]),
    );

    this.rubrics.set(previousRubrics.map((rubric) => reorderedById.get(rubric.id) ?? rubric));
    this.orderSaving.set(true);

    const rollback = (): void => this.rubrics.set(previousRubrics);

    this.request(
      this.api.put<GradebookRubricsStoreResponse>(
        `${this.route()}/${this.studyPlanId()}/${this.gradebook().id}/order`,
        { gradebook_rubric_ids: reorderedRubrics.map((rubric) => rubric.id) },
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
        this.rubrics.set(response.data.rubrics);
      },
      error: () => {
        rollback();
        this.ignoreHandledRequestError();
      },
    });
  }

  private loadRubrics(): void {
    this.loaded.set(false);
    this.executeSilentRequest<GradebookRubricsResponse>(
      this.api.get(`${this.route()}/${this.studyPlanId()}/${this.gradebook().id}`),
      (response) => {
        this.grades.set(response.data.grades);
        this.rubrics.set(response.data.rubrics);
        this.setScreenOptions(response.data.options);
        this.selectedGradeId.set(response.data.grades[0]?.id ?? null);
        this.loaded.set(true);
      },
    );
  }
  private loadCandidates(gradeId: number): void {
    const requestSequence = ++this.candidatesRequestSequence;
    const route = `${this.route()}/${this.studyPlanId()}/${this.gradebook().id}/candidates?grade_id=${encodeURIComponent(String(gradeId))}`;

    this.candidatesLoading.set(true);

    this.executeSilentRequest<GradebookRubricCandidatesResponse>(
      this.api.get(route, { loader: false }),
      (response) => {
        if (requestSequence !== this.candidatesRequestSequence || !this.addPanelOpen()) return;
        this.candidates.set(response.data.candidates);
      },
      () => {
        if (requestSequence === this.candidatesRequestSequence) this.candidates.set([]);
      },
      () => {
        if (requestSequence === this.candidatesRequestSequence) this.candidatesLoading.set(false);
      },
    );
  }
}
