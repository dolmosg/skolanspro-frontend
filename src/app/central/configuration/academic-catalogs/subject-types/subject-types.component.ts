import { Component, computed, OnInit, signal, Type } from '@angular/core';
import { TranslateModule, TranslatePipe } from '@ngx-translate/core';
import { ColDef, GetRowIdParams } from 'ag-grid-community';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { SklConfirmModal } from '@shared/base/skl-confirm-modal/skl-confirm-modal';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import {
  SubjectTypeModalComponent,
  ISubjectTypeModalData,
  ISubjectTypeModalResult,
} from '../subject-type-modal/subject-type-modal.component';

interface SubjectTypesRouteData {
  collectionKey: string;
  itemKey: string;
  title: string;
}

interface SubjectTypesIndexData {
  'subject-types'?: SubjectTypeItem[];
  options?: Parameters<SkolansBaseComponent['setScreenOptions']>[0];
}

interface SubjectTypeMutationData {
  'subject-type'?: SubjectTypeItem;
  'subject-types'?: SubjectTypeItem[];
}

interface SubjectTypesOrderData {
  'subject-types'?: SubjectTypeItem[];
}

export interface SubjectTypeItem {
  id: number;
  name: string;
  translation: string | null;
  can_create: boolean;
  can_remove: boolean;
  automatic: boolean;
  searchable: boolean;
  uses_teams: boolean;
  active: boolean;
  order: number;
}

@Component({
  selector: 'app-subject-types',
  standalone: true,
  imports: [TranslateModule, TranslatePipe, UiButtonComponent, SkolansTable],
  templateUrl: './subject-types.component.html',
  styleUrl: './subject-types.component.scss',
})
export class SubjectTypesComponent extends SkolansBaseComponent implements OnInit {
  protected readonly catalog = signal<SubjectTypeItem[]>([]);
  protected readonly selectedItems = signal<SubjectTypeItem[]>([]);
  protected readonly config = signal<SubjectTypesRouteData | null>(null);

  protected readonly orderingMode = signal(false);
  protected readonly savingOrder = signal(false);

  protected readonly title = computed(() => this.config()?.title ?? '');

  protected readonly hasSelection = computed(() => this.selectedItems().length > 0);
  protected readonly hasSingleSelection = computed(() => this.selectedItems().length === 1);
  protected readonly tablePagination = computed(
    () => !this.orderingMode() && this.catalog().length > 10,
  );

  protected readonly columnDefs = computed<ColDef<SubjectTypeItem>[]>(() => {
    const ordering = this.orderingMode();

    const columns: ColDef<SubjectTypeItem>[] = [
      {
        headerValueGetter: () => this.translate.instant('configuration.subject-types.fields.name'),
        field: 'name',
        flex: 1,
        minWidth: 160,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        headerValueGetter: () =>
          this.translate.instant('configuration.subject-types.fields.translation'),
        field: 'translation',
        flex: 1.6,
        minWidth: 240,
        sortable: !ordering,
        filter: false,
        floatingFilter: false,
        valueGetter: (params) => {
          const key = params.data?.translation;
          return key ? this.translate.instant(key) : '';
        },
      },
      {
        headerValueGetter: () =>
          this.translate.instant('configuration.subject-types.fields.automatic'),
        field: 'automatic',
        width: 170,
        minWidth: 170,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
        valueGetter: (params) =>
          params.data?.automatic
            ? this.translate.instant('common.yes')
            : this.translate.instant('common.no'),
      },
      {
        headerValueGetter: () =>
          this.translate.instant('configuration.subject-types.fields.can-create'),
        field: 'can_create',
        width: 190,
        minWidth: 190,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
        valueGetter: (params) =>
          params.data?.can_create
            ? this.translate.instant('common.yes')
            : this.translate.instant('common.no'),
      },
      {
        headerValueGetter: () =>
          this.translate.instant('configuration.subject-types.fields.can-remove'),
        field: 'can_remove',
        width: 200,
        minWidth: 200,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
        valueGetter: (params) =>
          params.data?.can_remove
            ? this.translate.instant('common.yes')
            : this.translate.instant('common.no'),
      },
      {
        headerValueGetter: () =>
          this.translate.instant('configuration.subject-types.fields.searchable'),
        field: 'searchable',
        width: 210,
        minWidth: 210,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
        valueGetter: (params) =>
          params.data?.searchable
            ? this.translate.instant('common.yes')
            : this.translate.instant('common.no'),
      },
      {
        headerValueGetter: () =>
          this.translate.instant('configuration.subject-types.fields.uses-teams'),
        field: 'uses_teams',
        width: 200,
        minWidth: 200,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
        valueGetter: (params) =>
          params.data?.uses_teams
            ? this.translate.instant('common.yes')
            : this.translate.instant('common.no'),
      },
      {
        headerValueGetter: () =>
          this.translate.instant('configuration.subject-types.fields.active'),
        field: 'active',
        width: 120,
        minWidth: 120,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
        valueGetter: (params) =>
          params.data?.active
            ? this.translate.instant('common.yes')
            : this.translate.instant('common.no'),
      },
    ];

    if (!ordering) {
      return columns;
    }

    return [
      {
        colId: 'drag',
        width: 56,
        rowDrag: true,
      },
      ...columns,
    ];
  });

  protected readonly getRowId = (params: GetRowIdParams<SubjectTypeItem>): string =>
    String(params.data.id);

  ngOnInit(): void {
    this.initRouteMeta();

    const data = this.activatedRoute.snapshot.data as SubjectTypesRouteData;

    this.config.set({
      collectionKey: data.collectionKey,
      itemKey: data.itemKey,
      title: data.title,
    });

    this.loadCatalog();
  }

  protected onSelectionChange(selection: unknown[]): void {
    this.selectedItems.set(selection as SubjectTypeItem[]);
  }

  protected loadCatalog(): void {
    const route = this.apiRoute();

    if (!route) return;

    this.executeSilentRequest<SubjectTypesIndexData | SubjectTypeItem[]>(
      this.api.get(route),
      (response) => {
        this.catalog.set(this.extractItems(response.data));
        this.setScreenOptions(Array.isArray(response.data) ? undefined : response.data?.options);
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
    this.loadCatalog();
  }

  protected saveOrder(): void {
    const route = this.apiRoute();
    if (!route || this.savingOrder()) return;

    const ids = this.catalog().map((item) => item.id);

    this.savingOrder.set(true);

    this.executeSilentRequest(
      this.api.put(`${route}/set-order`, { ids }),
      () => {
        this.orderingMode.set(false);
        this.savingOrder.set(false);
      },
      () => this.savingOrder.set(false),
    );
  }

  private extractItems(data: any, fallback: SubjectTypeItem[] = []): SubjectTypeItem[] {
    if (Array.isArray(data)) return [...data].sort((a, b) => a.order - b.order);
    return [...(data?.['subject-types'] ?? fallback)].sort((a, b) => a.order - b.order);
  }

  openCreateModal(): void {
    const modalData: ISubjectTypeModalData = {
      title: this.translate.instant('configuration.subject-types.add'),
      collectionKey: this.config()?.collectionKey ?? 'subject-types',
      item: null,
      order: this.catalog().length,
    };

    this.modal
      .open<ISubjectTypeModalData, ISubjectTypeModalResult>({
        component: SubjectTypeModalComponent,
        data: modalData,
      })
      .then((result) => {
        if (!result?.saved) return;

        const route = this.apiRoute();
        if (!route) return;

        this.executeMutationRequest(this.api.post(route, result.payload), () => this.loadCatalog());
      });
  }

  openEditModal(): void {
    const selected = this.selectedItems()[0];
    if (!selected) return;

    const modalData: ISubjectTypeModalData = {
      title: this.translate.instant('configuration.subject-types.update'),
      collectionKey: this.config()?.collectionKey ?? 'subject-types',
      item: selected,
      order: selected.order,
    };

    this.modal
      .open<ISubjectTypeModalData, ISubjectTypeModalResult>({
        component: SubjectTypeModalComponent,
        data: modalData,
      })
      .then((result) => {
        if (!result?.saved) return;

        const route = this.apiRoute();
        if (!route) return;

        this.executeMutationRequest(this.api.put(`${route}/${selected.id}`, result.payload), () =>
          this.loadCatalog(),
        );
      });
  }

  protected async deleteItem(): Promise<void> {
    const selected = this.selectedItems()[0];
    const route = this.apiRoute();

    if (!route || !selected) return;

    const confirmed = await this.modal.open<any, boolean>({
      component: SklConfirmModal as Type<unknown>,
      title: this.translate.instant('configuration.subject-types.delete'),
      data: {
        message: this.translate.instant('configuration.subject-types.messages.confirm-delete'),
        confirmLabel: this.translate.instant('common.delete'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'danger',
      },
      size: 'sm',
      closeOnBackdrop: false,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) return;

    this.executeMutationRequest(this.api.delete(`${route}/${selected.id}`), () =>
      this.loadCatalog(),
    );
  }

  protected onRowOrderChange(rows: unknown[]): void {
    if (!Array.isArray(rows)) return;

    const ordered = rows as SubjectTypeItem[];

    this.catalog.set(ordered);
  }
}
