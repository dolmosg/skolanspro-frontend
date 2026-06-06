import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { ScreenOptionItem } from '@shared/interfaces/configuration.interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';
import { UiMetaItemComponent } from '@shared/ui/ui-meta-item/ui-meta-item.component';

import type { IStudyPlanGrade } from '../study-plan-academics/study-plan-academics.component';
import {
  SkolansSelectorModalComponent,
  SkolansSelectorModalData,
  SkolansSelectorModalItem,
  SkolansSelectorModalResult,
} from '@shared/base/skolans-selector-modal/skolans-selector-modal.component';
import {
  SklManagePeopleModalData,
  SklManagePeopleModalResult,
  SklManagePeopleModalComponent,
} from '@shared/base/skl-mange-people-modal/skl-mange-people-modal.component';

import {
  IStudyPlanStageSubject,
  IStudyPlanStageSubjectsStage,
  IStudyPlanCatalogItem,
  IStudyPlanSubjectType,
  IStudyPlanGradePolicy,
  IStudyPlanStageSubjectsCatalogs,
  StageSubjectGradeItem,
  StudyPlanStageSubjectsData,
} from '../study-plan-subjects.interfaces';
import { StageSubjectViewerComponent } from '../stage-subject-viewer/stage-subject-viewer.component';
import {
  StageSubjectEditorComponent,
  StageSubjectEditorResult,
} from '../stage-subject-editor/stage-subject-editor.component';

@Component({
  selector: 'app-study-plan-stage-subjects',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    TranslatePipe,
    UiButtonComponent,
    UiIconComponent,
    UiMetaItemComponent,
    StageSubjectViewerComponent,
    StageSubjectEditorComponent,
  ],
  templateUrl: './study-plan-stage-subjects.component.html',
  styleUrl: './study-plan-stage-subjects.component.scss',
})
export class StudyPlanStageSubjectsComponent extends SkolansBaseComponent {
  readonly stageId = input<number | null>(null);
  readonly initialGradeId = input<number | null>(null);
  readonly route = input<string | null>(null);

  readonly back = output<void>();

  protected readonly stage = signal<IStudyPlanStageSubjectsStage | null>(null);
  protected readonly grades = signal<IStudyPlanGrade[]>([]);
  protected readonly selectedGradeId = signal<number | null>(null);
  protected readonly selectedSubjectIds = signal<number[]>([]);
  protected readonly subjectSearch = signal('');
  protected readonly savingOrder = signal(false);
  protected readonly editingSubjectId = signal<number | null>(null);

  protected readonly catalogs = signal<IStudyPlanStageSubjectsCatalogs>({
    subject_types: [],
    evaluation_types: [],
    grade_policies: [],
    coordinators: [],
  });

  protected readonly orderedGrades = computed(() => {
    return [...this.grades()].sort((a, b) => a.order - b.order);
  });

  protected readonly stageSubjects = computed<IStudyPlanStageSubject[]>(() => {
    return this.stage()?.subjects ?? [];
  });

  protected readonly selectedGrade = computed(() => {
    const gradeId = this.selectedGradeId();

    if (gradeId === null) {
      return null;
    }

    return this.orderedGrades().find((grade) => grade.id === gradeId) ?? null;
  });

  protected readonly selectedSubjects = computed(() => {
    const gradeId = this.selectedGradeId();

    return this.stageSubjects()
      .filter((subject) => subject.grade_id === gradeId)
      .sort((a, b) => a.order - b.order);
  });

  protected readonly filteredSubjects = computed(() => {
    const search = this.normalizeSearch(this.subjectSearch());

    if (!search) {
      return this.selectedSubjects();
    }

    return this.selectedSubjects().filter((subject) => {
      const code = this.normalizeSearch(subject.subject?.code ?? '');
      const name = this.normalizeSearch(subject.subject?.name ?? '');

      return code.includes(search) || name.includes(search);
    });
  });

  protected readonly crossoverSubjects = computed(() => {
    return this.stageSubjects()
      .filter((subject) => subject.grade_id === null)
      .sort((a, b) => a.order - b.order);
  });

  protected readonly gradeItems = computed<StageSubjectGradeItem[]>(() => {
    return this.orderedGrades().map((grade) => {
      const count = this.stageSubjects().filter((subject) => subject.grade_id === grade.id).length;

      return {
        gradeId: grade.id,
        label: grade.description || grade.name,
        count,
        selected: this.selectedGradeId() === grade.id,
      };
    });
  });

  protected startEditingSubject(subject: IStudyPlanStageSubject): void {
    this.clearSubjectSelection();
    this.editingSubjectId.set(subject.id);
  }

  protected cancelEditingSubject(): void {
    this.editingSubjectId.set(null);
  }

  protected isEditingSubject(subjectId: number): boolean {
    return this.editingSubjectId() === subjectId;
  }

  protected hasEditingSubject(): boolean {
    return this.editingSubjectId() !== null;
  }

  protected readonly title = computed(() => {
    const grade = this.selectedGrade();

    return grade
      ? grade.description || grade.name
      : this.translate.instant('planning.study-plan-subjects.crossovers');
  });

  protected readonly subtitle = computed(() => this.stage()?.name ?? '');

  protected readonly isCrossoversSelected = computed(() => {
    return this.selectedGradeId() === null;
  });

  protected readonly hasActiveSearch = computed(() => {
    return this.normalizeSearch(this.subjectSearch()).length > 0;
  });

  protected readonly canReorder = computed(() => {
    return (
      this.filteredSubjects().length > 1 &&
      !this.savingOrder() &&
      !this.hasActiveSearch() &&
      !this.hasEditingSubject() &&
      !this.hasSelectedSubjects()
    );
  });

  protected readonly visibleSubjectsCount = computed(() => {
    return this.filteredSubjects().length;
  });

  protected readonly totalSelectedGradeSubjectsCount = computed(() => {
    return this.selectedSubjects().length;
  });

  protected readonly hasSelectedSubjects = computed(() => {
    return this.selectedSubjectIds().length > 0;
  });

  protected readonly footerActions = computed<ScreenOptionItem[]>(() => {
    return [
      this.getScreenOption('manage-coordinators'),
      this.getScreenOption('assign-evaluation-type'),
      this.getScreenOption('assign-subject-type'),
      this.getScreenOption('assign-grading-strategy'),
      this.getScreenOption('delete'),
    ].filter((action): action is ScreenOptionItem => !!action);
  });

  constructor() {
    super();

    effect(() => {
      const stageId = this.stageId();

      if (!stageId) {
        this.clearLoadedData();
        return;
      }

      this.loadStageSubjects(stageId);
    });
  }

  protected loadStageSubjects(stageId: number): void {
    const route = this.route();

    if (!route) {
      return;
    }

    this.executeSilentRequest<StudyPlanStageSubjectsData>(
      this.api.get(`${route}/${stageId}`),
      (res) => {
        this.stage.set(res.data.stage ?? null);
        this.grades.set(res.data.grades ?? []);
        this.setScreenOptions(res.data.options);
        this.setScreenChildren(res.data.children);

        this.catalogs.set({
          subject_types: res.data.catalogs?.subject_types ?? [],
          evaluation_types: res.data.catalogs?.evaluation_types ?? [],
          grade_policies: res.data.catalogs?.grade_policies ?? [],
          coordinators: res.data.catalogs?.coordinators ?? [],
        });

        this.selectedGradeId.set(this.initialGradeId());
        this.clearSubjectSearch();
        this.clearSubjectSelection();
      },
    );
  }

  protected updateSubjectSearch(value: string): void {
    this.subjectSearch.set(value);
    this.clearSubjectSelection();
  }

  protected clearSubjectSearch(): void {
    this.subjectSearch.set('');
  }

  protected isSubjectSelected(subjectId: number): boolean {
    return this.selectedSubjectIds().includes(subjectId);
  }

  protected toggleSubjectSelection(subjectId: number): void {
    const selected = this.selectedSubjectIds();

    if (selected.includes(subjectId)) {
      this.selectedSubjectIds.set(selected.filter((id) => id !== subjectId));
      return;
    }

    this.selectedSubjectIds.set([...selected, subjectId]);
  }

  protected clearSubjectSelection(): void {
    this.selectedSubjectIds.set([]);
  }

  protected selectGrade(gradeId: number): void {
    this.selectedGradeId.set(gradeId);
    this.clearSubjectSearch();
    this.clearSubjectSelection();
  }

  protected selectCrossovers(): void {
    this.selectedGradeId.set(null);
    this.clearSubjectSearch();
    this.clearSubjectSelection();
  }

  protected onBack(): void {
    this.back.emit();
  }

  protected subjectSettingsLabel(subject: IStudyPlanStageSubject): string {
    const settings: string[] = [];

    if (subject.extra) {
      settings.push(this.translate.instant('planning.study-plan-subjects.settings.extra-points'));
    }

    if (subject.descriptive_show) {
      settings.push(
        this.translate.instant(
          subject.descriptive_full
            ? 'planning.study-plan-subjects.settings.descriptive-sheet-full'
            : 'planning.study-plan-subjects.settings.descriptive-sheet',
        ),
      );
    }

    return settings.join(' | ');
  }

  protected subjectType(id: number | null): IStudyPlanSubjectType | null {
    if (!id) {
      return null;
    }

    return this.catalogs().subject_types.find((item) => item.id === id) ?? null;
  }

  protected evaluationType(id: number | null): IStudyPlanCatalogItem | null {
    if (!id) {
      return null;
    }

    return this.catalogs().evaluation_types.find((item) => item.id === id) ?? null;
  }

  protected gradePolicy(id: number | null): IStudyPlanGradePolicy | null {
    if (!id) {
      return null;
    }

    return this.catalogs().grade_policies.find((item) => item.id === id) ?? null;
  }

  protected subjectTypeLabel(id: number | null): string {
    return this.subjectType(id)?.translation ?? '';
  }

  protected subjectTypeHelp(id: number | null): string | null {
    return this.subjectType(id)?.help_translation ?? null;
  }

  protected evaluationTypeHelp(id: number | null): string {
    if (!id) return '';

    return this.catalogs().evaluation_types.find((item) => item.id === id)?.help_translation ?? '';
  }

  protected gradePolicyHelp(id: number | null): string {
    if (!id) return '';
    return this.catalogs().grade_policies.find((item) => item.id === id)?.help_translation ?? '';
  }

  protected evaluationTypeLabel(id: number | null): string {
    return this.evaluationType(id)?.translation ?? '';
  }

  protected gradePolicyLabel(id: number | null): string {
    return this.gradePolicy(id)?.translation ?? '';
  }

  protected coordinatorsLabel(subject: IStudyPlanStageSubject): string {
    const coordinators = subject.coordinators ?? [];

    if (coordinators.length === 0) {
      return this.translate.instant('planning.study-plan-subjects.coordinators.none');
    }

    return coordinators
      .map((coordinator) => coordinator.full_name || coordinator.full)
      .filter(Boolean)
      .join(', ');
  }

  protected hasCoordinators(subject: IStudyPlanStageSubject): boolean {
    return (subject.coordinators ?? []).length > 0;
  }

  protected onSubjectsDropped(event: CdkDragDrop<IStudyPlanStageSubject[]>): void {
    if (!this.canReorder()) {
      return;
    }

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const currentStage = this.stage();
    const gradeId = this.selectedGradeId();

    if (!currentStage) {
      return;
    }

    const rollbackSubjects = [...(currentStage.subjects ?? [])];
    const reorderedSelection = [...this.filteredSubjects()];

    moveItemInArray(reorderedSelection, event.previousIndex, event.currentIndex);

    const reorderedSelectionWithOrder = reorderedSelection.map((subject, index) => ({
      ...subject,
      order: index,
    }));

    const updatedSubjects = rollbackSubjects.map((subject) => {
      if (subject.grade_id !== gradeId) {
        return subject;
      }

      return reorderedSelectionWithOrder.find((item) => item.id === subject.id) ?? subject;
    });

    this.stage.set({
      ...currentStage,
      subjects: updatedSubjects,
    });

    this.saveOrder(reorderedSelectionWithOrder, rollbackSubjects);
  }

  protected saveOrder(
    subjects: IStudyPlanStageSubject[],
    rollbackSubjects: IStudyPlanStageSubject[],
  ): void {
    const route = this.route();
    const stageId = this.stageId();

    if (!route || !stageId) {
      return;
    }

    const payload = {
      items: subjects.map((subject) => ({
        id: subject.id,
        order: subject.order,
      })),
    };

    this.savingOrder.set(true);

    this.executeSilentRequest(
      this.api.put(`${route}/reorder/${stageId}`, payload),
      (res) => {
        this.handleApiSuccess(res);
        this.savingOrder.set(false);
      },
      () => {
        const currentStage = this.stage();

        if (currentStage) {
          this.stage.set({
            ...currentStage,
            subjects: rollbackSubjects,
          });
        }

        this.savingOrder.set(false);
      },
    );
  }

  protected executeAction(action: ScreenOptionItem): void {
    switch (action.name) {
      case 'assign-evaluation-type':
        this.assignEvaluationType();
        break;

      case 'assign-subject-type':
        this.assignSubjectType();
        break;

      case 'assign-grading-strategy':
        this.assignGradePolicy();
        break;

      case 'manage-coordinators':
        this.assignCoordinator();
        break;

      case 'delete':
        this.deleteSelectedSubjects();
        break;
    }
  }

  protected async assignEvaluationType(): Promise<void> {
    const evaluationTypeId = await this.selectCatalogValue(
      this.translate.instant('planning.study-plan-subjects.bulk.assign-evaluation-type.title'),
      this.bulkActionDescription(),
      this.catalogs().evaluation_types.map((item) => ({
        id: item.id,
        descriptor: this.translate.instant(item.translation),
      })),
    );

    if (!evaluationTypeId) {
      return;
    }

    const route = this.route();

    if (!route) {
      return;
    }

    this.executeMutationRequest<{ subjects: IStudyPlanStageSubject[] }>(
      this.api.put(`${route}/bulk-evaluation-type`, {
        subject_ids: this.selectedSubjectIds(),
        evaluation_type_id: evaluationTypeId,
      }),
      (res) => {
        this.replaceStageSubjects(res.data.subjects ?? []);
        this.clearSubjectSelection();
      },
    );
  }

  protected async assignSubjectType(): Promise<void> {
    const subjectTypeId = await this.selectCatalogValue(
      this.translate.instant('planning.study-plan-subjects.bulk.assign-subject-type.title'),
      this.bulkActionDescription(),
      this.catalogs().subject_types.map((item) => ({
        id: item.id,
        descriptor: this.translate.instant(item.translation),
      })),
    );

    if (!subjectTypeId) {
      return;
    }

    const route = this.route();

    if (!route) {
      return;
    }

    this.executeMutationRequest<{ subjects: IStudyPlanStageSubject[] }>(
      this.api.put(`${route}/bulk-subject-type`, {
        subject_ids: this.selectedSubjectIds(),
        subject_type_id: subjectTypeId,
      }),
      (res) => {
        this.replaceStageSubjects(res.data.subjects ?? []);
        this.clearSubjectSelection();
      },
    );
  }

  protected async assignGradePolicy(): Promise<void> {
    const result = await this.openSelector(
      this.translate.instant('planning.study-plan-subjects.bulk.assign-grading-strategy.title'),
      this.bulkActionDescription(),
      [
        {
          id: null,
          descriptor: this.translate.instant('planning.study-plan-subjects.grade-policy.none'),
        },
        ...this.catalogs().grade_policies.map((item) => ({
          id: item.id,
          descriptor: this.translate.instant(item.translation),
        })),
      ],
      false,
    );

    if (!result?.confirmed) {
      return;
    }

    const gradePolicyId = result.selectedId;

    const route = this.route();

    if (!route) {
      return;
    }

    this.executeMutationRequest<{ subjects: IStudyPlanStageSubject[] }>(
      this.api.put(`${route}/bulk-grade-policy`, {
        subject_ids: this.selectedSubjectIds(),
        grade_policy_id: gradePolicyId,
      }),
      (res) => {
        this.replaceStageSubjects(res.data.subjects ?? []);
        this.clearSubjectSelection();
      },
    );
  }

  protected async assignCoordinator(): Promise<void> {
    const coordinatorId = await this.selectCatalogValue(
      this.translate.instant('planning.study-plan-subjects.bulk.manage-coordinators.title'),
      this.bulkActionDescription(),
      this.catalogs().coordinators.map((item) => ({
        id: item.id,
        descriptor: item.full_name || item.full,
      })),
    );

    if (!coordinatorId) {
      return;
    }

    const route = this.route();

    if (!route) {
      return;
    }

    this.executeMutationRequest<{ subjects: IStudyPlanStageSubject[] }>(
      this.api.put(`${route}/bulk-coordinator`, {
        subject_ids: this.selectedSubjectIds(),
        coordinator_id: coordinatorId,
      }),
      (res) => {
        this.replaceStageSubjects(res.data.subjects ?? []);
        this.clearSubjectSelection();
      },
    );
  }

  protected onEditSubject(subject: IStudyPlanStageSubject): void {
    this.startEditingSubject(subject);
  }

  protected onDeleteSubject(subject: IStudyPlanStageSubject): void {
    console.log('delete subject', subject);
  }

  protected async onManageCoordinators(subject: IStudyPlanStageSubject): Promise<void> {
    const result = await this.modal.open<SklManagePeopleModalData, SklManagePeopleModalResult>({
      component: SklManagePeopleModalComponent,
      title: this.translate.instant('planning.study-plan-subjects.manage.coordinators.title'),
      description: subject.subject?.name ?? '',
      data: {
        people: this.catalogs().coordinators.map((item) => ({
          id: item.id,
          descriptor: item.full_name || item.full,
          photo: item.photo ?? null,
        })),
        selectedPeople: (subject.coordinators ?? []).map((item) => ({
          id: item.id,
          descriptor: item.full_name || item.full,
          photo: item.photo ?? null,
        })),
        placeholder: this.translate.instant(
          'planning.study-plan-subjects.manage.coordinators.placeholder',
        ),
        emptyMessage: this.translate.instant(
          'planning.study-plan-subjects.manage.coordinators.empty',
        ),
        selectedTitle: this.translate.instant(
          'planning.study-plan-subjects.manage.coordinators.assigned',
        ),
      },
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.confirmed) {
      return;
    }

    const route = this.route();

    if (!route) {
      return;
    }

    this.executeMutationRequest<{ subjects: IStudyPlanStageSubject[] }>(
      this.api.put(`${route}/sync-coordinators/${subject.id}`, {
        coordinator_ids: result.ids,
      }),
      (res) => {
        this.replaceStageSubjects(res.data.subjects ?? []);
      },
    );
  }

  protected deleteSelectedSubjects(): void {
    console.log({
      action: 'delete',
      selectedSubjects: this.selectedSubjectIds(),
    });
  }

  private bulkActionDescription(): string {
    return this.translate.instant('planning.study-plan-subjects.bulk.description', {
      count: this.selectedSubjectIds().length,
    });
  }

  protected saveSubject(payload: StageSubjectEditorResult): void {
    const route = this.route();

    if (!route) {
      return;
    }

    this.executeMutationRequest<{ subjects: IStudyPlanStageSubject[] }>(
      this.api.put(`${route}/${payload.id}`, payload),
      (res) => {
        this.replaceStageSubjects(res.data.subjects ?? []);
        this.cancelEditingSubject();
      },
    );
  }

  private replaceStageSubjects(updatedSubjects: IStudyPlanStageSubject[]): void {
    if (updatedSubjects.length === 0) {
      return;
    }

    const currentStage = this.stage();

    if (!currentStage) {
      return;
    }

    const updatedById = new Map(updatedSubjects.map((subject) => [subject.id, subject]));

    this.stage.set({
      ...currentStage,
      subjects: (currentStage.subjects ?? []).map((subject) => {
        return updatedById.get(subject.id) ?? subject;
      }),
    });
  }

  private async selectCatalogValue(
    title: string,
    description: string,
    items: SkolansSelectorModalItem[],
    required = true,
  ): Promise<number | null> {
    const result = await this.openSelector(title, description, items, required);

    if (!result?.confirmed) {
      return null;
    }

    if (required && result.selectedId === null) {
      return null;
    }

    return result.selectedId;
  }

  private async openSelector(
    title: string,
    description: string,
    items: SkolansSelectorModalItem[],
    required = true,
  ): Promise<SkolansSelectorModalResult | null> {
    return await this.modal.open<SkolansSelectorModalData, SkolansSelectorModalResult>({
      component: SkolansSelectorModalComponent,
      title,
      description,
      data: {
        items,
        required,
        placeholder: this.translate.instant('planning.study-plan-subjects.bulk.placeholder'),
      },
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });
  }

  private clearLoadedData(): void {
    this.stage.set(null);
    this.grades.set([]);
    this.selectedGradeId.set(null);
    this.selectedSubjectIds.set([]);
    this.subjectSearch.set('');
    this.savingOrder.set(false);
    this.clearScreenOptions();
    this.clearScreenChildren();

    this.catalogs.set({
      subject_types: [],
      evaluation_types: [],
      grade_policies: [],
      coordinators: [],
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
