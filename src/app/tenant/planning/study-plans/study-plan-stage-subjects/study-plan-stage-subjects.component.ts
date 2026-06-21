import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, catchError, throwError } from 'rxjs';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import {
  ISklConfirmModalData,
  SklConfirmModal,
} from '@shared/base/skl-confirm-modal/skl-confirm-modal';
import { ApiResponse } from '@shared/interfaces/api-response.interface';
import { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type {
  IEvaluationType,
  IGrade,
  IGradePolicy,
  ISubjectType,
} from '@shared/interfaces/configuration.interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

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
  IStudyPlanStageSubjectsCatalogs,
  StageSubjectGradeItem,
  StudyPlanStageSubjectsData,
} from '../study-plan-subjects.interfaces';
import type { IStudyPlanStage as IStudyPlanAcademicsStage } from '../study-plan-academics/study-plan-academics.component';
import { StageSubjectViewerComponent } from '../stage-subject-viewer/stage-subject-viewer.component';
import {
  StageSubjectEditorComponent,
  StageSubjectEditorResult,
} from '../stage-subject-editor/stage-subject-editor.component';
import { StageSubjectAssignmentComponent } from '../stage-subject-assignment/stage-subject-assignment.component';
import type { AssignedStudyPlanSubjectsResponse } from '../stage-subject-assignment/stage-subject-assignment.component';

type BulkSelectionItem = {
  id: number | null;
  name?: string | null;
  translation?: string | null;
  helpTranslation?: string | null;
  order?: number | null;
};

type DeleteStageSubjectResponse = {
  deleted_id?: number | null;
  academics_stage?: IStudyPlanAcademicsStage | null;
};

type BulkDeleteStageSubjectsResponse = {
  deleted_ids?: number[] | null;
  academics_stage?: IStudyPlanAcademicsStage | null;
};

type StageSubjectMutationResponse = {
  subjects?: IStudyPlanStageSubject[];
  academics_stage?: IStudyPlanAcademicsStage | null;
};

type ReorderStageSubjectsResponse = {
  items?: Array<{ id: number; order: number }>;
  academics_stage?: IStudyPlanAcademicsStage | null;
};

@Component({
  selector: 'app-study-plan-stage-subjects',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    TranslatePipe,
    UiButtonComponent,
    UiIconComponent,
    StageSubjectViewerComponent,
    StageSubjectEditorComponent,
    StageSubjectAssignmentComponent,
  ],
  templateUrl: './study-plan-stage-subjects.component.html',
  styleUrl: './study-plan-stage-subjects.component.scss',
})
export class StudyPlanStageSubjectsComponent extends SkolansBaseComponent {
  private readonly http = inject(HttpClient);

  readonly stageId = input<number | null>(null);
  readonly initialGradeId = input<number | null>(null);
  readonly route = input<string | null>(null);

  readonly back = output<void>();
  readonly academicsStageUpdated = output<IStudyPlanAcademicsStage>();

  protected readonly stage = signal<IStudyPlanStageSubjectsStage | null>(null);
  protected readonly grades = signal<IGrade[]>([]);
  protected readonly selectedGradeId = signal<number | null>(null);
  protected readonly selectedSubjectIds = signal<number[]>([]);
  protected readonly subjectSearch = signal('');
  protected readonly savingOrder = signal(false);
  protected readonly editingSubjectId = signal<number | null>(null);
  protected readonly isAddingSubjects = signal(false);

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
        label: grade.description || grade.name || '—',
        count,
        selected: this.selectedGradeId() === grade.id,
      };
    });
  });

  protected startEditingSubject(subject: IStudyPlanStageSubject): void {
    this.clearSubjectSelection();
    this.editingSubjectId.set(subject.id);
    this.setStudyPlanStageSubjectsAssistantContext();
  }

  protected cancelEditingSubject(): void {
    this.editingSubjectId.set(null);
    this.setStudyPlanStageSubjectsAssistantContext();
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
        this.setStudyPlanStageSubjectsAssistantContext();
      },
    );
  }

  protected updateSubjectSearch(value: string): void {
    this.subjectSearch.set(value);
    this.clearSubjectSelection();
    this.setStudyPlanStageSubjectsAssistantContext();
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
      this.setStudyPlanStageSubjectsAssistantContext();
      return;
    }

    this.selectedSubjectIds.set([...selected, subjectId]);
    this.setStudyPlanStageSubjectsAssistantContext();
  }

  protected clearSubjectSelection(): void {
    this.selectedSubjectIds.set([]);
    this.setStudyPlanStageSubjectsAssistantContext();
  }

  protected selectGrade(gradeId: number): void {
    if (this.isAddingSubjects()) {
      return;
    }

    this.selectedGradeId.set(gradeId);
    this.clearSubjectSearch();
    this.clearSubjectSelection();
    this.setStudyPlanStageSubjectsAssistantContext();
  }

  protected selectCrossovers(): void {
    if (this.isAddingSubjects()) {
      return;
    }

    this.selectedGradeId.set(null);
    this.clearSubjectSearch();
    this.clearSubjectSelection();
    this.setStudyPlanStageSubjectsAssistantContext();
  }

  protected startAddingSubjects(): void {
    if (!this.stageId() || !this.route()) {
      return;
    }

    this.editingSubjectId.set(null);
    this.selectedSubjectIds.set([]);
    this.subjectSearch.set('');
    this.isAddingSubjects.set(true);
    this.setAddingSubjectsAssistantContext();
  }

  protected cancelAddingSubjects(): void {
    this.isAddingSubjects.set(false);
    this.setStudyPlanStageSubjectsAssistantContext();
  }

  protected onSubjectsAssigned(result: AssignedStudyPlanSubjectsResponse): void {
    this.mergeStageSubjects(result.subjects ?? []);
    this.isAddingSubjects.set(false);
    this.selectedSubjectIds.set([]);
    this.subjectSearch.set('');
    this.emitAcademicsStageSnapshot(result.academics_stage);
    this.setStudyPlanStageSubjectsAssistantContext();
  }

  private setStudyPlanStageSubjectsAssistantContext(): void {
    const stage = this.stage();

    if (!stage) {
      return;
    }

    const selectedGrade = this.selectedGrade();
    const editingSubjectId = this.editingSubjectId();
    const editingSubject = editingSubjectId
      ? (this.stageSubjects().find((subject) => subject.id === editingSubjectId) ?? null)
      : null;
    const selectedSubjectIds = this.selectedSubjectIds();
    const hasSelectedSubjects = selectedSubjectIds.length > 0;
    const isCrossoversSelected = this.isCrossoversSelected();

    this.setAssistantContext({
      contextType: editingSubjectId ? 'editor' : 'component',
      contextId: 'planning.study-plans.academics.subjects',
      feature: 'study-plans',
      title: this.title(),
      subtitle: this.subtitle(),
      entity: 'StudyPlanStageSubject',
      mode: editingSubjectId
        ? 'subject-editing'
        : hasSelectedSubjects
          ? 'subjects-selected'
          : isCrossoversSelected
            ? 'crossovers-overview'
            : 'grade-subjects-overview',
      data: {
        stageId: stage.id,
        stageName: stage.name,
        selectedGradeId: this.selectedGradeId(),
        selectedGradeName: selectedGrade?.description ?? selectedGrade?.name ?? null,
        isCrossoversSelected,
        totalGrades: this.grades().length,
        totalSubjects: this.stageSubjects().length,
        selectedGradeSubjectsCount: this.totalSelectedGradeSubjectsCount(),
        visibleSubjectsCount: this.visibleSubjectsCount(),
        crossoverSubjectsCount: this.crossoverSubjects().length,
        selectedSubjectIds,
        selectedSubjectsCount: selectedSubjectIds.length,
        editingSubjectId,
        editingSubjectName: editingSubject?.subject?.name ?? null,
        editingSubjectCode: editingSubject?.subject?.code ?? null,
        editingSubjectGradeId: editingSubject?.grade_id ?? null,
        editingSubjectSubjectTypeId: editingSubject?.subject_type_id ?? null,
        editingSubjectEvaluationTypeId: editingSubject?.evaluation_type_id ?? null,
        editingSubjectGradePolicyId: editingSubject?.grade_policy_id ?? null,
        hasActiveSearch: this.hasActiveSearch(),
        subjectSearch: this.subjectSearch(),
        canReorder: this.canReorder(),
        savingOrder: this.savingOrder(),
        availableChildren: this.getAssistantAvailableChildren(),
        availableOptions: this.getAssistantAvailableOptions(),
        availableActions: this.footerActions().map((action) => ({
          id: action.id,
          name: action.name,
          translation: action.translation,
          icon: action.icon,
          color: action.color,
        })),
        catalogs: {
          subjectTypesCount: this.catalogs().subject_types.length,
          evaluationTypesCount: this.catalogs().evaluation_types.length,
          gradePoliciesCount: this.catalogs().grade_policies.length,
          coordinatorsCount: this.catalogs().coordinators.length,
        },
      },
    });
  }

  private setAddingSubjectsAssistantContext(): void {
    const stage = this.stage();

    if (!stage) {
      return;
    }

    const selectedGrade = this.selectedGrade();

    this.setAssistantContext({
      contextType: 'editor',
      contextId: 'planning.study-plans.academics.subjects',
      feature: 'study-plans',
      title: this.title(),
      subtitle: this.subtitle(),
      entity: 'StudyPlanStageSubject',
      mode: 'adding-subjects',
      data: {
        stageId: stage.id,
        stageName: stage.name,
        gradeId: this.selectedGradeId(),
        gradeName: selectedGrade?.description ?? selectedGrade?.name ?? null,
        isCrossoverMode: this.isCrossoversSelected(),
        availableActions: ['assign-subjects', 'cancel'],
      },
    });
  }

  private setBulkActionAssistantContext(
    action: ScreenOptionItem,
    selectionItems?: BulkSelectionItem[],
  ): void {
    const stage = this.stage();

    if (!stage) {
      return;
    }

    const selectedGrade = this.selectedGrade();
    const selectedSubjectIds = this.selectedSubjectIds();

    this.setAssistantContext({
      contextType: 'overlay',
      contextId: 'planning.study-plans.academics.subjects',
      feature: 'study-plans',
      title: action.translation,
      subtitle: this.bulkActionDescription(),
      entity: 'StudyPlanStageSubject',
      mode: `bulk-${action.name}`,
      data: {
        stageId: stage.id,
        stageName: stage.name,
        selectedGradeId: this.selectedGradeId(),
        selectedGradeName: selectedGrade?.description ?? selectedGrade?.name ?? null,
        isCrossoversSelected: this.isCrossoversSelected(),
        selectedSubjectIds,
        selectedSubjectsCount: selectedSubjectIds.length,
        bulkAction: action.name,
        bulkActionTitle: action.translation,
        bulkSelectionItems: selectionItems ?? [],
        bulkSelectionItemsCount: selectionItems?.length ?? 0,
        availableChildren: this.getAssistantAvailableChildren(),
        availableOptions: this.getAssistantAvailableOptions(),
        availableActions: this.footerActions().map((footerAction) => ({
          id: footerAction.id,
          name: footerAction.name,
          translation: footerAction.translation,
          icon: footerAction.icon,
          color: footerAction.color,
        })),
        catalogs: {
          subjectTypesCount: this.catalogs().subject_types.length,
          evaluationTypesCount: this.catalogs().evaluation_types.length,
          gradePoliciesCount: this.catalogs().grade_policies.length,
          coordinatorsCount: this.catalogs().coordinators.length,
        },
      },
    });
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

  protected subjectType(id: number | null): ISubjectType | null {
    if (!id) {
      return null;
    }

    return this.catalogs().subject_types.find((item) => item.id === id) ?? null;
  }

  protected evaluationType(id: number | null): IEvaluationType | null {
    if (!id) {
      return null;
    }

    return this.catalogs().evaluation_types.find((item) => item.id === id) ?? null;
  }

  protected gradePolicy(id: number | null): IGradePolicy | null {
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
    this.setStudyPlanStageSubjectsAssistantContext();

    this.executeSilentRequest<ReorderStageSubjectsResponse>(
      this.api.put(`${route}/reorder/${stageId}`, payload),
      (res) => {
        this.handleApiSuccess(res);
        this.savingOrder.set(false);
        this.emitAcademicsStageSnapshot(res.data.academics_stage);
        this.setStudyPlanStageSubjectsAssistantContext();
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
        this.setStudyPlanStageSubjectsAssistantContext();
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
    try {
      const selectionItems: BulkSelectionItem[] = this.catalogs().evaluation_types.map((item) => ({
        id: item.id,
        name: item.name,
        translation: this.translate.instant(item.translation),
        helpTranslation: item.help_translation
          ? this.translate.instant(item.help_translation)
          : null,
        order: item.order ?? null,
      }));
      const action = this.getScreenOption('assign-evaluation-type');

      if (action) {
        this.setBulkActionAssistantContext(action, selectionItems);
      }

      const evaluationTypeId = await this.selectCatalogValue(
        this.translate.instant('planning.study-plan-subjects.bulk.assign-evaluation-type.title'),
        this.bulkActionDescription(),
        selectionItems.map((item) => ({
          id: item.id,
          descriptor: item.translation ?? '',
        })),
      );

      if (!evaluationTypeId) {
        return;
      }

      const route = this.route();

      if (!route) {
        return;
      }

      this.executeMutationRequest<StageSubjectMutationResponse>(
        this.api.put(`${route}/bulk-evaluation-type`, {
          subject_ids: this.selectedSubjectIds(),
          evaluation_type_id: evaluationTypeId,
        }),
        (res) => {
          this.replaceStageSubjects(res.data.subjects ?? []);
          this.clearSubjectSelection();
          this.emitAcademicsStageSnapshot(res.data.academics_stage);
        },
      );
    } finally {
      this.setStudyPlanStageSubjectsAssistantContext();
    }
  }

  protected async assignSubjectType(): Promise<void> {
    try {
      const selectionItems: BulkSelectionItem[] = this.catalogs().subject_types.map((item) => ({
        id: item.id,
        name: item.name,
        translation: this.translate.instant(item.translation),
        helpTranslation: item.help_translation
          ? this.translate.instant(item.help_translation)
          : null,
        order: item.order ?? null,
      }));
      const action = this.getScreenOption('assign-subject-type');

      if (action) {
        this.setBulkActionAssistantContext(action, selectionItems);
      }

      const subjectTypeId = await this.selectCatalogValue(
        this.translate.instant('planning.study-plan-subjects.bulk.assign-subject-type.title'),
        this.bulkActionDescription(),
        selectionItems.map((item) => ({
          id: item.id,
          descriptor: item.translation ?? '',
        })),
      );

      if (!subjectTypeId) {
        return;
      }

      const route = this.route();

      if (!route) {
        return;
      }

      this.executeMutationRequest<StageSubjectMutationResponse>(
        this.api.put(`${route}/bulk-subject-type`, {
          subject_ids: this.selectedSubjectIds(),
          subject_type_id: subjectTypeId,
        }),
        (res) => {
          this.replaceStageSubjects(res.data.subjects ?? []);
          this.clearSubjectSelection();
          this.emitAcademicsStageSnapshot(res.data.academics_stage);
        },
      );
    } finally {
      this.setStudyPlanStageSubjectsAssistantContext();
    }
  }

  protected async assignGradePolicy(): Promise<void> {
    try {
      const selectionItems: BulkSelectionItem[] = [
        {
          id: null,
          name: 'none',
          translation: this.translate.instant('planning.study-plan-subjects.grade-policy.none'),
          helpTranslation: null,
          order: null,
        },
        ...this.catalogs().grade_policies.map((item) => ({
          id: item.id,
          name: item.name,
          translation: this.translate.instant(item.translation),
          helpTranslation: item.help_translation
            ? this.translate.instant(item.help_translation)
            : null,
          order: item.order ?? null,
        })),
      ];
      const action = this.getScreenOption('assign-grading-strategy');

      if (action) {
        this.setBulkActionAssistantContext(action, selectionItems);
      }

      const result = await this.openSelector(
        this.translate.instant('planning.study-plan-subjects.bulk.assign-grading-strategy.title'),
        this.bulkActionDescription(),
        selectionItems.map((item) => ({
          id: item.id,
          descriptor: item.translation ?? '',
        })),
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

      this.executeMutationRequest<StageSubjectMutationResponse>(
        this.api.put(`${route}/bulk-grade-policy`, {
          subject_ids: this.selectedSubjectIds(),
          grade_policy_id: gradePolicyId,
        }),
        (res) => {
          this.replaceStageSubjects(res.data.subjects ?? []);
          this.clearSubjectSelection();
          this.emitAcademicsStageSnapshot(res.data.academics_stage);
        },
      );
    } finally {
      this.setStudyPlanStageSubjectsAssistantContext();
    }
  }

  protected async assignCoordinator(): Promise<void> {
    try {
      const action = this.getScreenOption('manage-coordinators');

      if (action) {
        this.setBulkActionAssistantContext(action);
      }

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

      this.executeMutationRequest<StageSubjectMutationResponse>(
        this.api.put(`${route}/bulk-coordinator`, {
          subject_ids: this.selectedSubjectIds(),
          coordinator_id: coordinatorId,
        }),
        (res) => {
          this.replaceStageSubjects(res.data.subjects ?? []);
          this.clearSubjectSelection();
          this.emitAcademicsStageSnapshot(res.data.academics_stage);
        },
      );
    } finally {
      this.setStudyPlanStageSubjectsAssistantContext();
    }
  }

  protected onEditSubject(subject: IStudyPlanStageSubject): void {
    this.startEditingSubject(subject);
  }

  protected async onDeleteSubject(subject: IStudyPlanStageSubject): Promise<void> {
    const route = this.route();

    if (!route) {
      return;
    }

    const confirmed = await this.confirmDeleteSubject(this.stageSubjectLabel(subject));

    if (!confirmed) {
      this.setStudyPlanStageSubjectsAssistantContext();
      return;
    }

    this.executeMutationRequest<DeleteStageSubjectResponse>(
      this.api.delete(`${route}/${subject.id}`),
      (res) => {
        this.removeStageSubjects([res.data.deleted_id ?? subject.id]);
        this.emitAcademicsStageSnapshot(res.data.academics_stage);
        this.setStudyPlanStageSubjectsAssistantContext();
      },
    );
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

    this.executeMutationRequest<StageSubjectMutationResponse>(
      this.api.put(`${route}/sync-coordinators/${subject.id}`, {
        coordinator_ids: result.ids,
      }),
      (res) => {
        this.replaceStageSubjects(res.data.subjects ?? []);
        this.emitAcademicsStageSnapshot(res.data.academics_stage);
      },
    );
  }

  protected async deleteSelectedSubjects(): Promise<void> {
    const selectedSubjectIds = this.selectedSubjectIds();

    if (selectedSubjectIds.length === 0) {
      return;
    }

    const route = this.route();

    if (!route) {
      return;
    }

    const action = this.getScreenOption('delete');

    if (action) {
      this.setBulkActionAssistantContext(action);
    }

    const confirmed = await this.confirmBulkDeleteSubjects(selectedSubjectIds.length);

    if (!confirmed) {
      this.setStudyPlanStageSubjectsAssistantContext();
      return;
    }

    this.setStudyPlanStageSubjectsAssistantContext();

    this.executeMutationRequest<BulkDeleteStageSubjectsResponse>(
      this.deleteStageSubjects(route, selectedSubjectIds),
      (res) => {
        this.removeStageSubjects(res.data.deleted_ids ?? selectedSubjectIds);
        this.emitAcademicsStageSnapshot(res.data.academics_stage);
        this.setStudyPlanStageSubjectsAssistantContext();
      },
    );
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

    this.executeMutationRequest<StageSubjectMutationResponse>(
      this.api.put(`${route}/${payload.id}`, payload),
      (res) => {
        this.replaceStageSubjects(res.data.subjects ?? []);
        this.emitAcademicsStageSnapshot(res.data.academics_stage);
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

  private removeStageSubjects(ids: number[]): void {
    if (ids.length === 0) {
      return;
    }

    const currentStage = this.stage();

    if (!currentStage) {
      return;
    }

    const deletedIds = new Set(ids);

    this.stage.set({
      ...currentStage,
      subjects: (currentStage.subjects ?? []).filter((subject) => !deletedIds.has(subject.id)),
    });

    this.selectedSubjectIds.set(this.selectedSubjectIds().filter((id) => !deletedIds.has(id)));

    if (this.editingSubjectId() !== null && deletedIds.has(this.editingSubjectId() as number)) {
      this.editingSubjectId.set(null);
    }
  }

  private async confirmDeleteSubject(subject: string): Promise<boolean> {
    const confirmed = await this.modal.open<ISklConfirmModalData, boolean>({
      component: SklConfirmModal,
      title: this.translate.instant('planning.study-plan-subjects.delete-modal.title'),
      data: {
        message: this.translate.instant('planning.study-plan-subjects.delete-modal.description', {
          subject,
        }),
        confirmLabel: this.translate.instant('planning.study-plan-subjects.delete-modal.confirm'),
        cancelLabel: this.translate.instant('planning.study-plan-subjects.delete-modal.cancel'),
        type: 'danger',
      },
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    return confirmed === true;
  }

  private async confirmBulkDeleteSubjects(count: number): Promise<boolean> {
    const confirmed = await this.modal.open<ISklConfirmModalData, boolean>({
      component: SklConfirmModal,
      title: this.translate.instant('planning.study-plan-subjects.delete-modal.bulk-title'),
      data: {
        message: this.translate.instant(
          'planning.study-plan-subjects.delete-modal.bulk-description',
          { count },
        ),
        confirmLabel: this.translate.instant('planning.study-plan-subjects.delete-modal.confirm'),
        cancelLabel: this.translate.instant('planning.study-plan-subjects.delete-modal.cancel'),
        type: 'danger',
      },
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    return confirmed === true;
  }

  private deleteStageSubjects(
    route: string,
    subjectIds: number[],
  ): Observable<ApiResponse<BulkDeleteStageSubjectsResponse>> {
    return this.http
      .request<ApiResponse<BulkDeleteStageSubjectsResponse>>(
        'DELETE',
        this.apiConfig.buildUrl(`${route}/bulk-delete`),
        {
          body: {
            subject_ids: subjectIds,
          },
          headers: this.buildDeleteHeaders(),
        },
      )
      .pipe(catchError((error: HttpErrorResponse) => this.handleDeleteHttpError(error)));
  }

  private buildDeleteHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    const locale = localStorage.getItem('skolans-language') || 'es-MX';
    let headers = new HttpHeaders({
      locale,
      'Accept-Language': locale,
      Accept: 'application/json',
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  private handleDeleteHttpError(error: HttpErrorResponse): Observable<never> {
    if (error?.status === 0) {
      this.toast.error('errors.network');
      return throwError(() => error);
    }

    const message = this.deleteHttpErrorMessage(error);

    if (error?.status !== 422) {
      this.toast.error(message);
    }

    return throwError(() => error);
  }

  private deleteHttpErrorMessage(error: HttpErrorResponse): string {
    const body = error?.error;

    if (!body) {
      return 'errors.unexpected';
    }

    if (typeof body === 'string') {
      return body;
    }

    if (typeof body.message === 'string' && body.message.trim().length > 0) {
      return body.message;
    }

    if (typeof body.error === 'string' && body.error.trim().length > 0) {
      return body.error;
    }

    return 'errors.unexpected';
  }

  private stageSubjectLabel(subject: IStudyPlanStageSubject): string {
    const code = subject.subject?.code?.trim();
    const name = subject.subject?.name?.trim();

    if (code && name) {
      return `${code} - ${name}`;
    }

    return name || code || `#${subject.id}`;
  }

  private mergeStageSubjects(newSubjects: IStudyPlanStageSubject[]): void {
    if (newSubjects.length === 0) {
      return;
    }

    const currentStage = this.stage();

    if (!currentStage) {
      return;
    }

    const mergedById = new Map<number, IStudyPlanStageSubject>();

    for (const subject of currentStage.subjects ?? []) {
      mergedById.set(subject.id, subject);
    }

    for (const subject of newSubjects) {
      mergedById.set(subject.id, subject);
    }

    this.stage.set({
      ...currentStage,
      subjects: Array.from(mergedById.values()),
    });
  }

  private emitAcademicsStageSnapshot(stage: IStudyPlanAcademicsStage | null | undefined): void {
    if (!stage) {
      return;
    }

    this.academicsStageUpdated.emit(stage);
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
    this.isAddingSubjects.set(false);
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
