import { Component, computed, OnInit, signal, Type } from '@angular/core';
import { TranslateModule, TranslatePipe } from '@ngx-translate/core';
import { ColDef, GetRowIdParams } from 'ag-grid-community';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { SklConfirmModal } from '@shared/base/skl-confirm-modal/skl-confirm-modal';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import {
  GroupTypesModalComponent,
  IGroupTypeModalData,
  IGroupTypeModalResult,
} from '../group-types-modal/group-types-modal.component';

interface GroupTypesRouteData {
  collectionKey: string;
  itemKey: string;
  title: string;
}

interface GroupTypesIndexData {
  'group-types'?: GroupTypeItem[];
  options?: Parameters<SkolansBaseComponent['setScreenOptions']>[0];
}

interface GroupTypeMutationData {
  'group-type'?: GroupTypeItem;
  'group-types'?: GroupTypeItem[];
}

interface GroupTypesOrderData {
  'group-types'?: GroupTypeItem[];
}

export interface GroupTypeItem {
  id: number;
  name: string;
  translation: string | null;
  requires_subject: boolean;
  active: boolean;
  order: number;
}

@Component({
  selector: 'app-group-types',
  standalone: true,
  imports: [TranslateModule, TranslatePipe, UiButtonComponent, SkolansTable],
  templateUrl: './group-types.component.html',
  styleUrl: './group-types.component.scss',
})
export class GroupTypesComponent extends SkolansBaseComponent implements OnInit {
  protected readonly catalog = signal<GroupTypeItem[]>([]);
  protected readonly selectedItems = signal<GroupTypeItem[]>([]);
  protected readonly config = signal<GroupTypesRouteData | null>(null);

  protected readonly orderingMode = signal(false);
  protected readonly savingOrder = signal(false);

  protected readonly title = computed(() => this.config()?.title ?? '');
  protected readonly itemsCount = computed(() => this.catalog().length);

  protected readonly hasSelection = computed(() => this.selectedItems().length > 0);
  protected readonly hasSingleSelection = computed(() => this.selectedItems().length === 1);
  protected readonly tablePagination = computed(
    () => !this.orderingMode() && this.catalog().length > 10,
  );

  protected readonly columnDefs = computed<ColDef<GroupTypeItem>[]>(() => {
    const ordering = this.orderingMode();

    const columns: ColDef<GroupTypeItem>[] = [
      {
        headerValueGetter: () => this.translate.instant('configuration.group-types.fields.name'),
        field: 'name',
        flex: 1,
        minWidth: 180,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        headerValueGetter: () =>
          this.translate.instant('configuration.group-types.fields.translation'),
        field: 'translation',
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
        headerValueGetter: () =>
          this.translate.instant('configuration.group-types.fields.requires-subject'),
        field: 'requires_subject',
        width: 180,
        minWidth: 180,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
        valueGetter: (params) =>
          params.data?.requires_subject
            ? this.translate.instant('common.yes')
            : this.translate.instant('common.no'),
      },
      {
        headerValueGetter: () => this.translate.instant('configuration.group-types.fields.active'),
        field: 'active',
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
        headerValueGetter: () => this.translate.instant('configuration.group-types.fields.order'),
        field: 'order',
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

  protected readonly getRowId = (params: GetRowIdParams<GroupTypeItem>): string => {
    return String(params.data.id);
  };

  ngOnInit(): void {
    this.initRouteMeta();

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const data = this.activatedRoute.snapshot.data as GroupTypesRouteData;

    this.config.set({
      collectionKey: data.collectionKey,
      itemKey: data.itemKey,
      title: data.title,
    });

    this.loadCatalog();
  }

  protected onSelectionChange(selection: unknown[]): void {
    this.selectedItems.set(selection as GroupTypeItem[]);
  }

  protected loadCatalog(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest<GroupTypesIndexData | GroupTypeItem[]>(
      this.api.get(route),
      (response) => {
        const items = this.extractItems(response.data);

        this.catalog.set(items);
        this.setScreenOptions(Array.isArray(response.data) ? undefined : response.data?.options);
        this.selectedItems.set([]);
      },
      () => {
        this.catalog.set([]);
        this.setScreenOptions([]);
        this.selectedItems.set([]);
      },
    );
  }

  protected async openCreateModal(): Promise<void> {
    const config = this.config();
    const route = this.apiRoute();

    if (!config || !route) {
      return;
    }

    const result = await this.modal.open<IGroupTypeModalData, IGroupTypeModalResult>({
      component: GroupTypesModalComponent,
      data: {
        title: config.title,
        collectionKey: config.collectionKey,
        item: null,
        order: this.catalog().length,
      },
      title: this.translate.instant(config.title),
      description: this.translate.instant('configuration.group-types.messages.create-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.executeMutationRequest(
      this.api.post<GroupTypeMutationData>(route, result.payload),
      (response) => {
        const created = this.extractItem(response.data);

        if (!created) {
          this.loadCatalog();
          return;
        }

        this.catalog.set(this.extractItems(response.data, [...this.catalog(), created]));
        this.selectedItems.set([]);
      },
    );
  }

  protected async openEditModal(item?: GroupTypeItem): Promise<void> {
    const config = this.config();
    const route = this.apiRoute();
    const selected = item ?? this.selectedItems()[0];

    if (!config || !route || !selected) {
      return;
    }

    const result = await this.modal.open<IGroupTypeModalData, IGroupTypeModalResult>({
      component: GroupTypesModalComponent,
      data: {
        title: config.title,
        collectionKey: config.collectionKey,
        item: selected,
        order: selected.order,
      },
      title: this.translate.instant(config.title),
      description: this.translate.instant('configuration.group-types.messages.edit-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.executeMutationRequest(
      this.api.put<GroupTypeMutationData>(`${route}/${selected.id}`, {
        ...result.payload,
        order: selected.order,
      }),
      (response) => {
        const updated = this.extractItem(response.data);

        if (!updated) {
          this.loadCatalog();
          return;
        }

        const fallback = this.catalog().map((catalogItem) =>
          catalogItem.id === updated.id ? updated : catalogItem,
        );

        this.catalog.set(this.extractItems(response.data, fallback));
        this.selectedItems.set([updated]);
      },
    );
  }

  protected async deleteSelected(): Promise<void> {
    const selected = this.selectedItems()[0];

    if (!selected) {
      return;
    }

    await this.deleteItem(selected);
  }

  protected async deleteItem(item: GroupTypeItem): Promise<void> {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const confirmed = await this.modal.open<any, boolean>({
      component: SklConfirmModal as Type<unknown>,
      data: {
        message: this.translate.instant('configuration.group-types.messages.confirm-delete'),
        confirmLabel: this.translate.instant('common.delete'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'danger',
      },
      title: this.translate.instant('configuration.group-types.delete'),
      size: 'sm',
      closeOnBackdrop: false,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) {
      return;
    }

    this.executeMutationRequest(
      this.api.delete<GroupTypesIndexData>(`${route}/${item.id}`),
      (response) => {
        const fallback = this.catalog().filter((catalogItem) => catalogItem.id !== item.id);

        this.catalog.set(this.extractItems(response.data, fallback));
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

  protected onRowOrderChange(event: unknown): void {
    if (!Array.isArray(event)) {
      return;
    }

    this.catalog.set(
      (event as GroupTypeItem[]).map((item, index) => ({
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

    const ids = this.catalog().map((item) => item.id);

    this.savingOrder.set(true);

    this.executeSilentRequest<GroupTypesOrderData | GroupTypeItem[]>(
      this.api.put(`${route}/set-order`, { ids }),
      (response) => {
        this.handleApiSuccess(response);

        this.catalog.set(this.extractItems(response.data, this.catalog()));
        this.orderingMode.set(false);
        this.selectedItems.set([]);
        this.savingOrder.set(false);
      },
      () => {
        this.savingOrder.set(false);
      },
    );
  }

  protected trackById(_: number, item: GroupTypeItem): number {
    return item.id;
  }

  private extractItem(data: GroupTypeMutationData | undefined): GroupTypeItem | null {
    const candidate = data?.['group-type'];

    if (!candidate || !this.isGroupTypeItem(candidate)) {
      return null;
    }

    return candidate;
  }

  private extractItems(
    data: GroupTypesIndexData | GroupTypesOrderData | GroupTypeItem[] | undefined,
    fallback: GroupTypeItem[] = [],
  ): GroupTypeItem[] {
    if (Array.isArray(data)) {
      return this.sortItems(data);
    }

    const items = data?.['group-types'];

    if (!Array.isArray(items)) {
      return this.sortItems(fallback);
    }

    return this.sortItems(items);
  }

  private sortItems(items: GroupTypeItem[]): GroupTypeItem[] {
    return [...items].sort((a, b) => a.order - b.order);
  }

  private isGroupTypeItem(value: unknown): value is GroupTypeItem {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const item = value as Partial<GroupTypeItem>;

    return (
      typeof item.id === 'number' &&
      typeof item.name === 'string' &&
      (typeof item.translation === 'string' || item.translation === null) &&
      typeof item.requires_subject === 'boolean' &&
      typeof item.active === 'boolean' &&
      typeof item.order === 'number'
    );
  }
}