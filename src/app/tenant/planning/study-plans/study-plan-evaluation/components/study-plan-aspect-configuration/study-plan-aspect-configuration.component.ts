import { Component, computed, effect, input, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { ColDef, GetRowIdParams, ICellRendererParams } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import {
  type ISklConfirmModalData,
  SklConfirmModal,
} from '@shared/base/skl-confirm-modal/skl-confirm-modal';
import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import type {
  StudyPlanAspectConfigurationResponse,
  StudyPlanAspectModeName,
  StudyPlanAspectSelectionContextResponse,
  StudyPlanAspectUpdatePayload,
  StudyPlanConfiguredAspect,
} from './study-plan-aspect-configuration.interfaces';

type StudyPlanAspectEditor = 'add' | 'weight' | 'activities' | 'aspect';

interface StudyPlanAspectEditCellParams extends ICellRendererParams<StudyPlanConfiguredAspect> {
  onEdit: (aspect: StudyPlanConfiguredAspect) => void;
  editLabel: string;
}

@Component({
  selector: 'app-study-plan-aspect-edit-cell',
  imports: [UiButtonComponent],
  template: `
    <app-ui-button
      [label]="editLabel"
      [title]="editLabel"
      iconLeft="edit"
      [iconOnly]="true"
      variant="ghost"
      size="sm"
      (click)="edit()"
    />
  `,
})
class StudyPlanAspectEditCellRenderer {
  protected editLabel = '';
  private aspect: StudyPlanConfiguredAspect | null = null;
  private onEdit: ((aspect: StudyPlanConfiguredAspect) => void) | null = null;

  agInit(params: StudyPlanAspectEditCellParams): void {
    this.aspect = params.data ?? null;
    this.onEdit = params.onEdit;
    this.editLabel = params.editLabel;
  }

  refresh(params: StudyPlanAspectEditCellParams): boolean {
    this.agInit(params);
    return true;
  }

  protected edit(): void {
    if (this.aspect) {
      this.onEdit?.(this.aspect);
    }
  }
}

/**
 * State ownership
 * ---------------
 * The configuration response is the canonical API state. Editor signals contain temporary UI
 * drafts and selections only. Successful mutations replace the complete configuration with the
 * backend response; the frontend never reconstructs configured aspects manually. Changing the
 * configuration context clears table selection and every open editor draft.
 */
@Component({
  selector: 'app-study-plan-aspect-configuration',
  imports: [
    SkolansTable,
    SkSelectComponent,
    TranslatePipe,
    UiButtonComponent,
  ],
  templateUrl: './study-plan-aspect-configuration.component.html',
  styleUrl: './study-plan-aspect-configuration.component.scss',
})
export class StudyPlanAspectConfigurationComponent extends SkolansBaseComponent {
  readonly route = input.required<string>();
  readonly studyPlanId = input.required<number>();
  readonly stageId = input.required<number>();
  readonly gradeId = input<number | null>(null);
  readonly screenOptions = input<ScreenOptionItem[]>([]);

  protected readonly configurationContext = signal<StudyPlanAspectSelectionContextResponse | null>(
    null,
  );
  protected readonly aspectConfiguration = signal<StudyPlanAspectConfigurationResponse | null>(
    null,
  );
  protected readonly selectedTermId = new FormControl<number | null>(null);
  protected readonly selectedStageSubjectId = new FormControl<number | null>(null);
  protected readonly selectedAspects = signal<StudyPlanConfiguredAspect[]>([]);
  protected readonly activeEditor = signal<StudyPlanAspectEditor | null>(null);
  protected readonly availableAspectSearch = signal('');
  protected readonly selectedAvailableAspectIds = signal<number[]>([]);
  protected readonly weightDraft = signal('');
  protected readonly activitiesDraft = signal('');
  protected readonly editingAspect = signal<StudyPlanConfiguredAspect | null>(null);
  protected readonly aspectAutomaticDraft = signal<boolean>(false);
  protected readonly aspectWeightDraft = signal('');
  protected readonly aspectActivitiesDraft = signal('');
  protected readonly selectedAspectCount = computed(() => this.selectedAspects().length);
  protected readonly configuredAspects = computed(
    () => this.aspectConfiguration()?.configured_aspects ?? [],
  );
  protected readonly configuredAspectCount = computed(() => this.configuredAspects().length);
  protected readonly availableAspects = computed(
    () => this.aspectConfiguration()?.available_aspects ?? [],
  );
  protected readonly filteredAvailableAspects = computed(() => {
    const search = this.availableAspectSearch().trim().toLocaleLowerCase();

    if (!search) {
      return this.availableAspects();
    }

    return this.availableAspects().filter((aspect) =>
      [aspect.name, aspect.description ?? ''].some((value) =>
        value.toLocaleLowerCase().includes(search),
      ),
    );
  });
  protected readonly selectedAvailableAspectCount = computed(
    () => this.selectedAvailableAspectIds().length,
  );
  protected readonly canSelectAllAvailableAspects = computed(
    () =>
      this.availableAspects().length > 0 &&
      this.selectedAvailableAspectCount() < this.availableAspects().length,
  );
  protected readonly isAddEditorOpen = computed(() => this.activeEditor() === 'add');
  protected readonly normalizedWeightDraft = computed(() =>
    this.normalizeWeight(this.weightDraft()),
  );
  protected readonly normalizedActivitiesDraft = computed(() =>
    this.normalizeActivities(this.activitiesDraft()),
  );
  protected readonly normalizedAspectWeightDraft = computed(() =>
    this.normalizeWeight(this.aspectWeightDraft()),
  );
  protected readonly normalizedAspectActivitiesDraft = computed(() =>
    this.normalizeActivities(this.aspectActivitiesDraft()),
  );
  protected readonly hasSelectedAspects = computed(() => this.selectedAspectCount() > 0);
  protected readonly areAllAspectsSelected = computed(() => {
    const configuredCount = this.configuredAspectCount();

    return configuredCount > 0 && this.selectedAspectCount() === configuredCount;
  });
  protected readonly columnDefs = computed<ColDef<StudyPlanConfiguredAspect>[]>(() => [
    {
      headerValueGetter: () =>
        this.translate.instant('planning.study-plan-aspects.configuration.columns.aspect'),
      valueGetter: (params) => params.data?.aspect.name ?? '',
      flex: 1,
      minWidth: 220,
    },
    {
      field: 'automatic',
      headerValueGetter: () =>
        this.translate.instant('planning.study-plan-aspects.configuration.columns.automatic'),
      width: 130,
      minWidth: 130,
      valueFormatter: (params) =>
        this.translate.instant(params.value === true ? 'common.yes' : 'common.no'),
    },
    {
      field: 'weight',
      headerValueGetter: () =>
        this.translate.instant('planning.study-plan-aspects.configuration.columns.weight'),
      width: 125,
      minWidth: 125,
      valueFormatter: (params) => this.formatWeight(params.value),
    },
    {
      field: 'activities',
      headerValueGetter: () =>
        this.translate.instant('planning.study-plan-aspects.configuration.columns.activities'),
      width: 135,
      minWidth: 135,
    },
    {
      field: 'order',
      headerValueGetter: () =>
        this.translate.instant('planning.study-plan-aspects.configuration.columns.order'),
      width: 105,
      minWidth: 105,
    },
    ...(this.getScreenOption('update')
      ? [
          {
            colId: 'edit',
            headerName: '',
            width: 64,
            minWidth: 64,
            maxWidth: 64,
            sortable: false,
            resizable: false,
            cellRenderer: StudyPlanAspectEditCellRenderer,
            cellRendererParams: {
              onEdit: (aspect: StudyPlanConfiguredAspect) => this.openAspectEditor(aspect),
              editLabel: this.translate.instant('planning.study-plan-aspects.update'),
            },
          },
        ]
      : []),
  ]);
  protected readonly getRowId = (params: GetRowIdParams<StudyPlanConfiguredAspect>): string =>
    `${params.data.stage_subject_id ?? 'stage'}:${params.data.study_plan_term_id ?? 'stage'}:${params.data.aspect.id}`;

  private readonly selectedTermIdValue = toSignal(this.selectedTermId.valueChanges, {
    initialValue: this.selectedTermId.value,
  });
  private readonly selectedStageSubjectIdValue = toSignal(
    this.selectedStageSubjectId.valueChanges,
    { initialValue: this.selectedStageSubjectId.value },
  );
  private readonly aspectTable = viewChild<SkolansTable>('aspectTable');

  private lastContextRequestKey: string | null = null;
  private lastConfigurationRequestKey: string | null = null;
  private readonly actionSelectionRules: Partial<
    Record<ScreenOptionItem['name'], (selectedCount: number) => boolean>
  > = {
    add: (selectedCount) => selectedCount === 0,
    update: (selectedCount) => selectedCount === 1,
  };

  constructor() {
    super();

    effect(() => {
      this.setScreenOptions(this.screenOptions());
    });

    effect(() => {
      const route = this.route();
      const studyPlanId = this.studyPlanId();
      const stageId = this.stageId();
      const gradeId = this.gradeId();

      if (!route || !studyPlanId || !stageId) {
        this.lastContextRequestKey = null;
        this.apiRoute.set(null);
        this.clearContext();
        return;
      }

      const requestKey = `${route}:${studyPlanId}:${stageId}:${gradeId ?? 'crossover'}`;

      if (requestKey === this.lastContextRequestKey) {
        return;
      }

      this.lastContextRequestKey = requestKey;
      this.apiRoute.set(route);
      this.clearContext();
      this.loadConfigurationContext(route, studyPlanId, stageId, gradeId, requestKey);
    });

    effect(() => {
      const route = this.route();
      const studyPlanId = this.studyPlanId();
      const stageId = this.stageId();
      const gradeId = this.gradeId();
      const context = this.configurationContext();
      const termId = this.selectedTermIdValue();
      const stageSubjectId = this.selectedStageSubjectIdValue();

      if (
        !route ||
        !studyPlanId ||
        !stageId ||
        !context ||
        !this.isSelectionComplete(context.aspect_mode.name, termId, stageSubjectId)
      ) {
        this.clearAspectConfiguration();
        return;
      }

      const aspectMode = context.aspect_mode.name;
      const requestKey = [
        route,
        studyPlanId,
        stageId,
        gradeId ?? 'crossover',
        aspectMode,
        termId ?? 'none',
        stageSubjectId ?? 'none',
      ].join(':');

      if (requestKey === this.lastConfigurationRequestKey) {
        return;
      }

      this.lastConfigurationRequestKey = requestKey;
      this.aspectConfiguration.set(null);
      this.clearSelection();
      this.loadAspectConfiguration(
        route,
        studyPlanId,
        stageId,
        gradeId,
        aspectMode,
        termId,
        stageSubjectId,
        requestKey,
      );
    });
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedAspects.set(rows as StudyPlanConfiguredAspect[]);
  }

  protected isActionDisabled(action: ScreenOptionItem): boolean {
    const selectedCount = this.selectedAspectCount();
    const isEnabled = this.actionSelectionRules[action.name] ?? ((count: number) => count > 0);

    return !isEnabled(selectedCount);
  }

  protected toggleAllAspects(): void {
    if (this.areAllAspectsSelected()) {
      this.clearSelection();
      return;
    }

    this.aspectTable()?.selectAll();
  }

  protected onAction(action: ScreenOptionItem): void {
    switch (action.name) {
      case 'add':
        this.openAddEditor();
        break;
      case 'automatic':
      case 'manual':
      case 'delete':
        void this.confirmConfigurationAction(action.name);
        break;
      case 'weight':
        this.openWeightEditor();
        break;
      case 'activities':
        this.openActivitiesEditor();
        break;
      case 'update':
        if (this.selectedAspects().length === 1) {
          this.openAspectEditor(this.selectedAspects()[0]);
        }
        break;
    }
  }

  protected closeEditor(): void {
    this.resetEditors();
  }

  protected onAvailableAspectSearch(event: Event): void {
    const input = event.target;

    if (input instanceof HTMLInputElement) {
      this.availableAspectSearch.set(input.value);
    }
  }

  protected isAvailableAspectSelected(aspectId: number): boolean {
    return this.selectedAvailableAspectIds().includes(aspectId);
  }

  protected toggleAvailableAspect(aspectId: number): void {
    this.selectedAvailableAspectIds.update((selectedIds) =>
      selectedIds.includes(aspectId)
        ? selectedIds.filter((id) => id !== aspectId)
        : [...selectedIds, aspectId],
    );
  }

  protected selectAllAvailableAspects(): void {
    this.selectedAvailableAspectIds.set(this.availableAspects().map((aspect) => aspect.id));
  }

  protected clearAvailableAspectSelection(): void {
    this.selectedAvailableAspectIds.set([]);
  }

  protected addSelectedAspects(): void {
    const route = this.route();
    const studyPlanId = this.studyPlanId();
    const stageId = this.stageId();
    const gradeId = this.gradeId();
    const context = this.configurationContext();
    const termId = this.selectedTermIdValue();
    const stageSubjectId = this.selectedStageSubjectIdValue();
    const aspectIds = this.selectedAvailableAspectIds();

    if (
      !route ||
      !studyPlanId ||
      !stageId ||
      !context ||
      aspectIds.length === 0 ||
      this.loading() ||
      !this.isSelectionComplete(context.aspect_mode.name, termId, stageSubjectId)
    ) {
      return;
    }

    const requestKey = this.lastConfigurationRequestKey;

    if (!requestKey) {
      return;
    }

    const requestRoute = this.buildConfigurationRoute(
      route,
      studyPlanId,
      stageId,
      gradeId,
      context.aspect_mode.name,
      termId,
      stageSubjectId,
    );

    this.executeMutationRequest<StudyPlanAspectConfigurationResponse>(
      this.api.post<StudyPlanAspectConfigurationResponse>(requestRoute, {
        aspect_ids: aspectIds,
      }),
      (response) => {
        if (requestKey !== this.lastConfigurationRequestKey) {
          return;
        }

        this.aspectConfiguration.set(response.data);
        this.resetEditors();
        this.clearSelection();
      },
    );
  }

  protected onWeightDraftChange(event: Event): void {
    const input = event.target;

    if (input instanceof HTMLInputElement) {
      this.weightDraft.set(input.value);
    }
  }

  protected prepareWeightChange(): void {
    const route = this.route();
    const studyPlanId = this.studyPlanId();
    const stageId = this.stageId();
    const gradeId = this.gradeId();
    const context = this.configurationContext();
    const termId = this.selectedTermIdValue();
    const stageSubjectId = this.selectedStageSubjectIdValue();
    const weight = this.normalizedWeightDraft();
    const aspectIds = [...new Set(this.selectedAspects().map((item) => item.aspect.id))];
    const requestKey = this.lastConfigurationRequestKey;

    if (
      !route ||
      !studyPlanId ||
      !stageId ||
      !context ||
      !requestKey ||
      aspectIds.length === 0 ||
      weight === null ||
      weight < 0 ||
      weight > 1 ||
      this.loading() ||
      !this.isSelectionComplete(context.aspect_mode.name, termId, stageSubjectId)
    ) {
      return;
    }

    const requestRoute = this.buildConfigurationRoute(
      route,
      studyPlanId,
      stageId,
      gradeId,
      context.aspect_mode.name,
      termId,
      stageSubjectId,
      'weight',
    );

    this.executeMutationRequest<StudyPlanAspectConfigurationResponse>(
      this.api.post<StudyPlanAspectConfigurationResponse>(requestRoute, {
        aspect_ids: aspectIds,
        weight,
      }),
      (response) => {
        if (requestKey !== this.lastConfigurationRequestKey) {
          return;
        }

        this.aspectConfiguration.set(response.data);
        this.resetEditors();
        this.clearSelection();
      },
    );
  }

  protected onActivitiesDraftChange(event: Event): void {
    const input = event.target;

    if (input instanceof HTMLInputElement) {
      this.activitiesDraft.set(input.value);
    }
  }

  protected onAspectAutomaticDraftChange(event: Event): void {
    const input = event.target;

    if (input instanceof HTMLInputElement) {
      this.aspectAutomaticDraft.set(input.checked);
    }
  }

  protected onAspectWeightDraftChange(event: Event): void {
    const input = event.target;

    if (input instanceof HTMLInputElement) {
      this.aspectWeightDraft.set(input.value);
    }
  }

  protected onAspectActivitiesDraftChange(event: Event): void {
    const input = event.target;

    if (input instanceof HTMLInputElement) {
      this.aspectActivitiesDraft.set(input.value);
    }
  }

  protected canSaveAspectEditor(): boolean {
    const context = this.configurationContext();

    return (
      !this.loading() &&
      this.editingAspect() !== null &&
      typeof this.aspectAutomaticDraft() === 'boolean' &&
      this.normalizedAspectWeightDraft() !== null &&
      this.normalizedAspectActivitiesDraft() !== null &&
      context !== null &&
      this.isSelectionComplete(
        context.aspect_mode.name,
        this.selectedTermIdValue(),
        this.selectedStageSubjectIdValue(),
      )
    );
  }

  protected saveAspectEditor(): void {
    const route = this.route();
    const studyPlanId = this.studyPlanId();
    const stageId = this.stageId();
    const gradeId = this.gradeId();
    const context = this.configurationContext();
    const termId = this.selectedTermIdValue();
    const stageSubjectId = this.selectedStageSubjectIdValue();
    const editingAspect = this.editingAspect();
    const weight = this.normalizedAspectWeightDraft();
    const activities = this.normalizedAspectActivitiesDraft();
    const requestKey = this.lastConfigurationRequestKey;

    if (
      !route ||
      !studyPlanId ||
      !stageId ||
      !context ||
      !editingAspect ||
      !requestKey ||
      weight === null ||
      activities === null ||
      !this.canSaveAspectEditor()
    ) {
      return;
    }

    const payload: StudyPlanAspectUpdatePayload = {
      aspect_id: editingAspect.aspect.id,
      automatic: this.aspectAutomaticDraft(),
      weight,
      activities,
    };
    const requestRoute = this.buildConfigurationRoute(
      route,
      studyPlanId,
      stageId,
      gradeId,
      context.aspect_mode.name,
      termId,
      stageSubjectId,
      'aspect',
    );

    this.executeMutationRequest<StudyPlanAspectConfigurationResponse>(
      this.api.post<StudyPlanAspectConfigurationResponse>(requestRoute, payload),
      (response) => {
        if (requestKey !== this.lastConfigurationRequestKey) {
          return;
        }

        this.aspectConfiguration.set(response.data);
        this.resetEditors();
      },
    );
  }

  protected prepareActivitiesChange(): void {
    const route = this.route();
    const studyPlanId = this.studyPlanId();
    const stageId = this.stageId();
    const gradeId = this.gradeId();
    const context = this.configurationContext();
    const termId = this.selectedTermIdValue();
    const stageSubjectId = this.selectedStageSubjectIdValue();
    const activities = this.normalizedActivitiesDraft();
    const aspectIds = [...new Set(this.selectedAspects().map((item) => item.aspect.id))];
    const requestKey = this.lastConfigurationRequestKey;

    if (
      !route ||
      !studyPlanId ||
      !stageId ||
      !context ||
      !requestKey ||
      aspectIds.length === 0 ||
      activities === null ||
      activities < 0 ||
      this.loading() ||
      !this.isSelectionComplete(context.aspect_mode.name, termId, stageSubjectId)
    ) {
      return;
    }

    const requestRoute = this.buildConfigurationRoute(
      route,
      studyPlanId,
      stageId,
      gradeId,
      context.aspect_mode.name,
      termId,
      stageSubjectId,
      'activities',
    );

    this.executeMutationRequest<StudyPlanAspectConfigurationResponse>(
      this.api.post<StudyPlanAspectConfigurationResponse>(requestRoute, {
        aspect_ids: aspectIds,
        activities,
      }),
      (response) => {
        if (requestKey !== this.lastConfigurationRequestKey) {
          return;
        }

        this.aspectConfiguration.set(response.data);
        this.resetEditors();
        this.clearSelection();
      },
    );
  }

  private openAddEditor(): void {
    this.resetEditors();
    this.clearSelection();
    this.activeEditor.set('add');
  }

  private openWeightEditor(): void {
    const selected = this.selectedAspects();
    const initialWeight = selected.length === 1 ? Number(selected[0].weight) * 100 : null;

    this.resetEditors();
    this.weightDraft.set(Number.isFinite(initialWeight) ? String(initialWeight) : '');
    this.activeEditor.set('weight');
  }

  private openActivitiesEditor(): void {
    const selected = this.selectedAspects();
    const initialActivities = selected.length === 1 ? selected[0].activities : null;

    this.resetEditors();
    this.activitiesDraft.set(initialActivities === null ? '' : String(initialActivities));
    this.activeEditor.set('activities');
  }

  protected openAspectEditor(aspect: StudyPlanConfiguredAspect): void {
    if (this.loading()) {
      return;
    }

    this.resetEditors();
    this.editingAspect.set(aspect);
    this.aspectAutomaticDraft.set(aspect.automatic);
    this.aspectWeightDraft.set(String(Number(aspect.weight) * 100));
    this.aspectActivitiesDraft.set(String(aspect.activities));
    this.activeEditor.set('aspect');
  }

  private async confirmConfigurationAction(
    action: 'automatic' | 'manual' | 'delete',
  ): Promise<void> {
    const confirmed = await this.modal.open<ISklConfirmModalData, boolean>({
      component: SklConfirmModal,
      title: this.translate.instant(
        `planning.study-plan-aspects.configuration.confirmations.${action}.title`,
      ),
      data: {
        message: this.translate.instant(
          `planning.study-plan-aspects.configuration.confirmations.${action}.description`,
          { count: this.selectedAspectCount() },
        ),
        confirmLabel: this.translate.instant(
          `planning.study-plan-aspects.configuration.confirmations.${action}.confirm`,
        ),
        cancelLabel: this.translate.instant('common.cancel'),
        type: action === 'delete' ? 'danger' : 'info',
      },
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (confirmed !== true) {
      return;
    }

    this.prepareConfirmedAction(action);
  }

  private prepareConfirmedAction(action: 'automatic' | 'manual' | 'delete'): void {
    if (action === 'delete') {
      this.deleteSelectedAspects();
      return;
    }

    this.updateSelectedAspectsAutomatic(action === 'automatic');
  }

  private updateSelectedAspectsAutomatic(automatic: boolean): void {
    const route = this.route();
    const studyPlanId = this.studyPlanId();
    const stageId = this.stageId();
    const gradeId = this.gradeId();
    const context = this.configurationContext();
    const termId = this.selectedTermIdValue();
    const stageSubjectId = this.selectedStageSubjectIdValue();
    const aspectIds = [...new Set(this.selectedAspects().map((item) => item.aspect.id))];
    const requestKey = this.lastConfigurationRequestKey;

    if (
      !route ||
      !studyPlanId ||
      !stageId ||
      !context ||
      !requestKey ||
      aspectIds.length === 0 ||
      this.loading() ||
      !this.isSelectionComplete(context.aspect_mode.name, termId, stageSubjectId)
    ) {
      return;
    }

    const requestRoute = this.buildConfigurationRoute(
      route,
      studyPlanId,
      stageId,
      gradeId,
      context.aspect_mode.name,
      termId,
      stageSubjectId,
      'automatic',
    );

    this.executeMutationRequest<StudyPlanAspectConfigurationResponse>(
      this.api.post<StudyPlanAspectConfigurationResponse>(requestRoute, {
        aspect_ids: aspectIds,
        automatic,
      }),
      (response) => {
        if (requestKey !== this.lastConfigurationRequestKey) {
          return;
        }

        this.aspectConfiguration.set(response.data);
        this.resetEditors();
        this.clearSelection();
      },
    );
  }

  private deleteSelectedAspects(): void {
    const route = this.route();
    const studyPlanId = this.studyPlanId();
    const stageId = this.stageId();
    const gradeId = this.gradeId();
    const context = this.configurationContext();
    const termId = this.selectedTermIdValue();
    const stageSubjectId = this.selectedStageSubjectIdValue();
    const aspectIds = [...new Set(this.selectedAspects().map((item) => item.aspect.id))];
    const requestKey = this.lastConfigurationRequestKey;

    if (
      !route ||
      !studyPlanId ||
      !stageId ||
      !context ||
      !requestKey ||
      aspectIds.length === 0 ||
      this.loading() ||
      !this.isSelectionComplete(context.aspect_mode.name, termId, stageSubjectId)
    ) {
      return;
    }

    const requestRoute = this.buildConfigurationRoute(
      route,
      studyPlanId,
      stageId,
      gradeId,
      context.aspect_mode.name,
      termId,
      stageSubjectId,
      'remove',
    );

    this.executeMutationRequest<StudyPlanAspectConfigurationResponse>(
      this.api.post<StudyPlanAspectConfigurationResponse>(requestRoute, {
        aspect_ids: aspectIds,
      }),
      (response) => {
        if (requestKey !== this.lastConfigurationRequestKey) {
          return;
        }

        this.aspectConfiguration.set(response.data);
        this.resetEditors();
        this.clearSelection();
      },
    );
  }

  private loadConfigurationContext(
    route: string,
    studyPlanId: number,
    stageId: number,
    gradeId: number | null,
    requestKey: string,
  ): void {
    const endpoint = `${route}/${studyPlanId}/${stageId}`;
    const requestRoute =
      gradeId === null
        ? endpoint
        : `${endpoint}?${new URLSearchParams({ grade_id: String(gradeId) }).toString()}`;

    this.executeSilentRequest<StudyPlanAspectSelectionContextResponse>(
      this.api.get(requestRoute),
      (response) => {
        if (requestKey !== this.lastContextRequestKey) {
          return;
        }

        this.configurationContext.set(response.data);
      },
      () => {
        if (requestKey !== this.lastContextRequestKey) {
          return;
        }

        this.clearContext();
      },
    );
  }

  private loadAspectConfiguration(
    route: string,
    studyPlanId: number,
    stageId: number,
    gradeId: number | null,
    aspectMode: StudyPlanAspectModeName,
    termId: number | null,
    stageSubjectId: number | null,
    requestKey: string,
  ): void {
    const requestRoute = this.buildConfigurationRoute(
      route,
      studyPlanId,
      stageId,
      gradeId,
      aspectMode,
      termId,
      stageSubjectId,
    );

    this.executeSilentRequest<StudyPlanAspectConfigurationResponse>(
      this.api.get(requestRoute),
      (response) => {
        if (requestKey !== this.lastConfigurationRequestKey) {
          return;
        }

        this.aspectConfiguration.set(response.data);
      },
      () => {
        if (requestKey !== this.lastConfigurationRequestKey) {
          return;
        }

        this.aspectConfiguration.set(null);
      },
    );
  }

  private buildConfigurationRoute(
    route: string,
    studyPlanId: number,
    stageId: number,
    gradeId: number | null,
    aspectMode: StudyPlanAspectModeName,
    termId: number | null,
    stageSubjectId: number | null,
    operation: 'activities' | 'aspect' | 'automatic' | 'remove' | 'weight' | null = null,
  ): string {
    const params = new URLSearchParams();

    if (gradeId !== null) {
      params.set('grade_id', String(gradeId));
    }

    if ((aspectMode === 'term' || aspectMode === 'full') && termId !== null) {
      params.set('term_id', String(termId));
    }

    if ((aspectMode === 'subject' || aspectMode === 'full') && stageSubjectId !== null) {
      params.set('stage_subject_id', String(stageSubjectId));
    }

    const endpoint = `${route}/${studyPlanId}/${stageId}/configuration${operation ? `/${operation}` : ''}`;
    const query = params.toString();

    return query ? `${endpoint}?${query}` : endpoint;
  }

  private isSelectionComplete(
    aspectMode: StudyPlanAspectModeName,
    termId: number | null,
    stageSubjectId: number | null,
  ): boolean {
    return (
      aspectMode === 'stage' ||
      (aspectMode === 'term' && termId !== null) ||
      (aspectMode === 'subject' && stageSubjectId !== null) ||
      (aspectMode === 'full' && termId !== null && stageSubjectId !== null)
    );
  }

  private formatWeight(weight: string | null | undefined): string {
    const value = Number(weight);

    if (!Number.isFinite(value)) {
      return '';
    }

    return new Intl.NumberFormat(this.translate.getCurrentLang(), {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private normalizeWeight(rawValue: string): number | null {
    if (!rawValue.trim()) {
      return null;
    }

    const value = Number(rawValue);
    const normalized = value / 100;

    return Number.isFinite(normalized) && normalized >= 0 && normalized <= 1 ? normalized : null;
  }

  private normalizeActivities(rawValue: string): number | null {
    if (!/^\d+$/.test(rawValue.trim())) {
      return null;
    }

    const value = Number(rawValue);

    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }

  private clearContext(): void {
    this.configurationContext.set(null);
    this.selectedTermId.reset(null);
    this.selectedStageSubjectId.reset(null);
    this.clearAspectConfiguration();
  }

  private clearAspectConfiguration(): void {
    this.lastConfigurationRequestKey = null;
    this.aspectConfiguration.set(null);
    this.clearSelection();
    this.resetEditors();
  }

  private clearSelection(): void {
    this.aspectTable()?.clearSelection();
    this.selectedAspects.set([]);
  }

  private resetEditors(): void {
    this.activeEditor.set(null);
    this.availableAspectSearch.set('');
    this.selectedAvailableAspectIds.set([]);
    this.weightDraft.set('');
    this.activitiesDraft.set('');
    this.editingAspect.set(null);
    this.aspectAutomaticDraft.set(false);
    this.aspectWeightDraft.set('');
    this.aspectActivitiesDraft.set('');
  }
}
