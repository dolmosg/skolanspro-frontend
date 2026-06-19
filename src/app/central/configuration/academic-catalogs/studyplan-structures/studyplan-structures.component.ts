import { Component, computed, OnInit, signal, Type } from '@angular/core';
import { TranslateModule, TranslatePipe } from '@ngx-translate/core';
import { ColDef, GetRowIdParams } from 'ag-grid-community';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { SklConfirmModal } from '@shared/base/skl-confirm-modal/skl-confirm-modal';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import {
  StudyPlanStructureModalComponent,
  IStudyplanStructureModalData,
  IStudyplanStructureModalResult,
} from '../study-plan-strucuture-modal/study-plan-strucuture-modal.component';

interface StudyplanStructuresIndexData {
  'study_plan-structures'?: StudyplanStructure[];
  options?: Parameters<SkolansBaseComponent['setScreenOptions']>[0];
}

interface StudyplanStructureMutationData {
  'studyplan-structure'?: StudyplanStructure;
  'study_plan-structures'?: StudyplanStructure[];
}

interface StudyplanStructuresOrderData {
  'study_plan-structures'?: StudyplanStructure[];
}

export interface StudyplanStructure {
  id: number;
  name: string;
  translation: string | null;
  stages: number;
  stage_name: string | null;
  active: boolean;
  order: number;
}

@Component({
  selector: 'app-study_plan-structures',
  standalone: true,
  imports: [TranslateModule, TranslatePipe, UiButtonComponent, SkolansTable],
  templateUrl: './studyplan-structures.component.html',
  styleUrl: './studyplan-structures.component.scss',
})
export class StudyplanStructuresComponent extends SkolansBaseComponent implements OnInit {
  protected readonly structures = signal<StudyplanStructure[]>([]);
  protected readonly selectedItems = signal<StudyplanStructure[]>([]);

  protected readonly orderingMode = signal(false);
  protected readonly savingOrder = signal(false);

  protected readonly hasSelection = computed(() => this.selectedItems().length > 0);
  protected readonly hasSingleSelection = computed(() => this.selectedItems().length === 1);

  protected readonly tablePagination = computed(
    () => !this.orderingMode() && this.structures().length > 10,
  );

  protected readonly columnDefs = computed<ColDef<StudyplanStructure>[]>(() => {
    const ordering = this.orderingMode();

    const columns: ColDef<StudyplanStructure>[] = [
      {
        field: 'name',
        headerValueGetter: () =>
          this.translate.instant('configuration.study_plan-structures.fields.name'),
        flex: 1,
        minWidth: 180,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'translation',
        headerValueGetter: () =>
          this.translate.instant('configuration.study_plan-structures.fields.translation'),
        flex: 1,
        minWidth: 260,
        sortable: !ordering,
        filter: false,
        floatingFilter: false,
        valueGetter: (params) => {
          const key = params.data?.translation;
          return key ? this.translate.instant(key) : '';
        },
      },
      {
        field: 'stages',
        headerValueGetter: () =>
          this.translate.instant('configuration.study_plan-structures.fields.stages'),
        width: 120,
        minWidth: 120,
        sortable: !ordering,
        filter: false,
        floatingFilter: false,
      },
      {
        field: 'stage_name',
        headerValueGetter: () =>
          this.translate.instant('configuration.study_plan-structures.fields.stage-name'),
        flex: 1,
        minWidth: 180,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'active',
        headerValueGetter: () =>
          this.translate.instant('configuration.study_plan-structures.fields.active'),
        width: 130,
        minWidth: 130,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
        valueGetter: (params) =>
          params.data?.active
            ? this.translate.instant('common.yes')
            : this.translate.instant('common.no'),
      },
      {
        field: 'order',
        headerValueGetter: () =>
          this.translate.instant('configuration.study_plan-structures.fields.order'),
        width: 110,
        minWidth: 110,
        sortable: !ordering,
        filter: false,
        floatingFilter: false,
      },
    ];

    if (!ordering) {
      return columns;
    }

    return [
      {
        colId: 'drag',
        headerName: '',
        width: 56,
        minWidth: 56,
        maxWidth: 56,
        sortable: false,
        filter: false,
        suppressMenu: true,
        suppressMovable: true,
        rowDrag: true,
      },
      ...columns,
    ];
  });

  protected readonly getRowId = (params: GetRowIdParams<StudyplanStructure>): string => {
    return String(params.data.id);
  };

  ngOnInit(): void {
    this.initRouteMeta();
    this.loadStructures();
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedItems.set(rows as StudyplanStructure[]);
  }

  protected loadStructures(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.clearScreenOptions();

    this.executeSilentRequest<StudyplanStructuresIndexData | StudyplanStructure[]>(
      this.api.get(route),
      (response) => {
        const structures = this.extractStructures(response.data);

        this.setScreenOptions(Array.isArray(response.data) ? undefined : response.data?.options);
        this.structures.set(structures);
        this.selectedItems.set([]);
      },
      () => {
        this.structures.set([]);
        this.setScreenOptions([]);
        this.selectedItems.set([]);
      },
    );
  }

  protected async onAdd(): Promise<void> {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const result = await this.modal.open<
      IStudyplanStructureModalData,
      IStudyplanStructureModalResult
    >({
      component: StudyPlanStructureModalComponent,
      data: {
        title: 'controllers.study_plan-structures',
        collectionKey: 'study_plan-structures',
        item: null,
        order: this.structures().length,
      },
      title: this.translate.instant('configuration.study_plan-structures.add'),
      description: this.translate.instant(
        'configuration.study_plan-structures.messages.create-description',
      ),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.executeMutationRequest(
      this.api.post<StudyplanStructureMutationData>(route, result.payload),
      (response) => {
        const created = this.extractStructure(response.data);

        if (!created) {
          this.loadStructures();
          return;
        }

        this.structures.set(this.extractStructures(response.data, [...this.structures(), created]));
        this.selectedItems.set([]);
      },
    );
  }

  protected async onEdit(): Promise<void> {
    const route = this.apiRoute();
    const selected = this.selectedItems()[0];

    if (!route || !selected) {
      return;
    }

    const result = await this.modal.open<
      IStudyplanStructureModalData,
      IStudyplanStructureModalResult
    >({
      component: StudyPlanStructureModalComponent,
      data: {
        title: 'controllers.study_plan-structures',
        collectionKey: 'study_plan-structures',
        item: selected,
        order: selected.order,
      },
      title: this.translate.instant('configuration.study_plan-structures.update'),
      description: this.translate.instant(
        'configuration.study_plan-structures.messages.update-description',
      ),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.executeMutationRequest(
      this.api.put<StudyplanStructureMutationData>(`${route}/${selected.id}`, {
        ...result.payload,
        order: selected.order,
      }),
      (response) => {
        const updated = this.extractStructure(response.data);

        if (!updated) {
          this.loadStructures();
          return;
        }

        const fallback = this.structures().map((item) => (item.id === updated.id ? updated : item));

        this.structures.set(this.extractStructures(response.data, fallback));
        this.selectedItems.set([updated]);
      },
    );
  }

  protected async onDelete(): Promise<void> {
    const route = this.apiRoute();
    const selected = this.selectedItems()[0];

    if (!route || !selected) {
      return;
    }

    const confirmed = await this.modal.open<any, boolean>({
      component: SklConfirmModal as Type<unknown>,
      data: {
        message: this.translate.instant(
          'configuration.study_plan-structures.messages.confirm-delete',
        ),
        confirmLabel: this.translate.instant('common.delete'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'danger',
      },
      title: this.translate.instant('configuration.study_plan-structures.delete'),
      size: 'sm',
      closeOnBackdrop: false,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) {
      return;
    }

    this.executeMutationRequest(
      this.api.delete<StudyplanStructuresIndexData>(`${route}/${selected.id}`),
      (response) => {
        const fallback = this.structures().filter((item) => item.id !== selected.id);

        this.structures.set(this.extractStructures(response.data, fallback));
        this.selectedItems.set([]);
      },
    );
  }

  protected startOrdering(): void {
    this.orderingMode.set(true);
    this.selectedItems.set([]);
  }

  protected cancelOrdering(): void {
    this.orderingMode.set(false);
    this.selectedItems.set([]);
    this.loadStructures();
  }

  protected onRowOrderChange(event: unknown): void {
    if (!Array.isArray(event)) {
      return;
    }

    this.structures.set(
      (event as StudyplanStructure[]).map((item, index) => ({
        ...item,
        order: index,
      })),
    );
  }

  protected saveOrder(): void {
    const route = this.apiRoute();

    if (!route || this.savingOrder()) {
      return;
    }

    const ids = this.structures().map((item) => item.id);

    this.savingOrder.set(true);

    this.executeSilentRequest<StudyplanStructuresOrderData | StudyplanStructure[]>(
      this.api.put(`${route}/set-order`, { ids }),
      (response) => {
        this.handleApiSuccess(response);

        this.structures.set(this.extractStructures(response.data, this.structures()));
        this.orderingMode.set(false);
        this.selectedItems.set([]);
        this.savingOrder.set(false);
      },
      () => {
        this.savingOrder.set(false);
      },
    );
  }

  private extractStructure(
    data: StudyplanStructureMutationData | undefined,
  ): StudyplanStructure | null {
    const candidate = data?.['studyplan-structure'];

    if (!candidate || !this.isStudyplanStructure(candidate)) {
      return null;
    }

    return candidate;
  }

  private extractStructures(
    data:
      | StudyplanStructuresIndexData
      | StudyplanStructuresOrderData
      | StudyplanStructure[]
      | undefined,
    fallback: StudyplanStructure[] = [],
  ): StudyplanStructure[] {
    if (Array.isArray(data)) {
      return this.sortStructures(data);
    }

    const structures = data?.['study_plan-structures'];

    if (!Array.isArray(structures)) {
      return this.sortStructures(fallback);
    }

    return this.sortStructures(structures);
  }

  private sortStructures(items: StudyplanStructure[]): StudyplanStructure[] {
    return [...items].sort((a, b) => a.order - b.order);
  }

  private isStudyplanStructure(value: unknown): value is StudyplanStructure {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const item = value as Partial<StudyplanStructure>;

    return (
      typeof item.id === 'number' &&
      typeof item.name === 'string' &&
      (typeof item.translation === 'string' || item.translation === null) &&
      typeof item.stages === 'number' &&
      (typeof item.stage_name === 'string' || item.stage_name === null) &&
      typeof item.active === 'boolean' &&
      typeof item.order === 'number'
    );
  }
}
