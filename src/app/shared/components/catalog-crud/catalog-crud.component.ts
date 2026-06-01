/**
 * CatalogCrudComponent
 *
 * Generic CRUD screen for simple central catalogs in SkolansPro.
 *
 * ------------------------------------------------------------------------
 * PURPOSE
 * ------------------------------------------------------------------------
 *
 * This component provides a reusable UI for managing central catalogs that
 * follow the standard SkolansPro catalog structure and behavior.
 *
 * It is intended to work with backend controllers based on:
 *
 * - CentralCatalogController
 *
 * and with API responses that follow the SkolansPro API contract.
 *
 * ------------------------------------------------------------------------
 * SUPPORTED CATALOG STRUCTURE
 * ------------------------------------------------------------------------
 *
 * This component assumes the catalog table contains:
 *
 * - id
 * - name
 * - translation
 * - active
 * - order
 *
 * No additional fields or relationships should be required.
 *
 * ------------------------------------------------------------------------
 * API CONTRACT
 * ------------------------------------------------------------------------
 *
 * Backend responses must use resource-specific keys (kebab-case):
 *
 * Index:
 * {
 *   [collectionKey]: CatalogItem[],
 *   options: ScreenOption[]
 * }
 *
 * Store / update:
 * {
 *   [collectionKey]: CatalogItem[],
 *   [itemKey]: CatalogItem
 * }
 *
 * Destroy / set-order:
 * {
 *   [collectionKey]: CatalogItem[]
 * }
 *
 * Example:
 *
 * {
 *   "success": true,
 *   "data": {
 *     "block-types": [],
 *     "options": []
 *   }
 * }
 *
 * IMPORTANT:
 * - Keys MUST be kebab-case
 * - Keys MUST match route metadata (`collectionKey`, `itemKey`)
 *
 * ------------------------------------------------------------------------
 * ROUTE DATA CONTRACT
 * ------------------------------------------------------------------------
 *
 * Angular routes must define:
 *
 * data: {
 *   title: string;
 *   collectionKey: string; // kebab-case, example: block-types
 *   itemKey: string;       // kebab-case, example: block-type
 *   api: {
 *     route: string;
 *   };
 * }
 *
 * Example:
 *
 * data: {
 *   title: 'controllers.block-types',
 *   collectionKey: 'block-types',
 *   itemKey: 'block-type',
 *   api: {
 *     route: 'configuration/block-types',
 *   },
 * }
 *
 * ------------------------------------------------------------------------
 * RESPONSIBILITIES
 * ------------------------------------------------------------------------
 *
 * - Load catalog records from the configured API route
 * - Render records using SkolansTable
 * - Read screen actions from backend permissions (`options`)
 * - Create records via CatalogModalComponent
 * - Update records via CatalogModalComponent
 * - Delete records with confirmation
 * - Support manual drag-and-drop ordering
 * - Persist ordering via `{route}/set-order`
 *
 * ------------------------------------------------------------------------
 * ORDERING BEHAVIOR
 * ------------------------------------------------------------------------
 *
 * - New records use: order = catalog.length
 * - Updates preserve existing order
 * - Manual ordering sends:
 *
 *   { ids: number[] }
 *
 * - Backend is responsible for normalizing and persisting order
 *
 * ------------------------------------------------------------------------
 * USAGE RULES
 * ------------------------------------------------------------------------
 *
 * Use this component when:
 *
 * ✔ The catalog is central
 * ✔ It uses the standard catalog structure
 * ✔ It does not require custom fields
 * ✔ It does not require complex relationships
 * ✔ It follows CentralCatalogController
 *
 * Do NOT use this component when:
 *
 * ✖ The catalog has additional fields (e.g. stages, configurable, etc.)
 * ✖ It requires a custom modal or UI logic
 * ✖ It involves tenant configuration
 * ✖ It involves relationships or pivots as primary behavior
 *
 * In those cases, create a dedicated component.
 *
 * ------------------------------------------------------------------------
 * NOTES
 * ------------------------------------------------------------------------
 *
 * - This component assumes strict alignment between:
 *   - backend response keys
 *   - route metadata
 *   - frontend extraction logic
 *
 * - No fallback to generic `item` or `items` keys should be used.
 *
 * - This component is the standard implementation for simple central catalogs.
 */

import { Component, computed, OnInit, signal, Type } from '@angular/core';
import { TranslateModule, TranslatePipe } from '@ngx-translate/core';
import { ColDef, GetRowIdParams } from 'ag-grid-community';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { SklConfirmModal } from '@shared/base/skl-confirm-modal/skl-confirm-modal';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { ScreenOptionItem } from '@shared/interfaces/configuration.interfaces';

import {
  CatalogModalComponent,
  ICatalogModalData,
  ICatalogModalResult,
} from '../catalog-modal/catalog-modal.component';

interface CatalogRouteData {
  collectionKey: string;
  itemKey: string;
  title: string;
}

export interface CatalogItem {
  id: number;
  name: string;
  translation: string | null;
  active: boolean;
  order: number;
}

type CatalogIndexResponse = {
  options?: ScreenOptionItem[];
} & Record<string, CatalogItem[] | ScreenOptionItem[] | undefined>;

type CatalogMutationResponse = Record<string, CatalogItem | CatalogItem[] | unknown>;

@Component({
  selector: 'app-catalog-crud',
  standalone: true,
  imports: [TranslateModule, TranslatePipe, UiButtonComponent, SkolansTable],
  templateUrl: './catalog-crud.component.html',
  styleUrl: './catalog-crud.component.scss',
})
export class CatalogCrudComponent extends SkolansBaseComponent implements OnInit {
  catalog = signal<CatalogItem[]>([]);
  selectedItems = signal<CatalogItem[]>([]);
  config = signal<CatalogRouteData | null>(null);

  orderingMode = signal(false);
  savingOrder = signal(false);

  title = computed(() => this.config()?.title ?? '');
  itemsCount = computed(() => this.catalog().length);

  hasSelection = computed(() => this.selectedItems().length > 0);
  hasSingleSelection = computed(() => this.selectedItems().length === 1);
  tablePagination = computed(() => !this.orderingMode() && this.catalog().length > 10);

  protected readonly columnDefs = computed<ColDef<CatalogItem>[]>(() => {
    const ordering = this.orderingMode();

    const columns: ColDef<CatalogItem>[] = [
      {
        headerValueGetter: () => this.translate.instant('configuration.catalogs.fields.name'),
        field: 'name',
        flex: 1,
        minWidth: 180,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        headerValueGetter: () =>
          this.translate.instant('configuration.catalogs.fields.translation'),
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
        headerValueGetter: () => this.translate.instant('configuration.catalogs.fields.active'),
        field: 'active',
        width: 130,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
        valueGetter: (params) =>
          params.data?.active
            ? this.translate.instant('common.yes')
            : this.translate.instant('common.no'),
      },
      {
        headerValueGetter: () => this.translate.instant('configuration.catalogs.fields.order'),
        field: 'order',
        width: 110,
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

  getRowId = (params: GetRowIdParams<CatalogItem>): string => {
    return String(params.data.id);
  };

  ngOnInit(): void {
    this.initRouteMeta();

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const data = this.activatedRoute.snapshot.data as CatalogRouteData;

    this.config.set({
      collectionKey: data.collectionKey,
      itemKey: data.itemKey,
      title: data.title,
    });

    this.loadCatalog();
  }

  onSelectionChange(selection: unknown[]): void {
    this.selectedItems.set(selection as CatalogItem[]);
  }

  onRowClicked(row: unknown): void {
    const item = row as CatalogItem;

    if (!item || !this.hasScreenOption('update')) {
      return;
    }

    void this.openEditModal(item);
  }

  loadCatalog(): void {
    const route = this.apiRoute();

    if (!this.config() || !route) {
      return;
    }

    this.executeSilentRequest<CatalogIndexResponse>(
      this.api.get(route),
      (response) => {
        this.catalog.set(this.extractCollection(response.data));
        const options = Array.isArray(response.data) ? undefined : response.data?.options;
        this.setScreenOptions(options);
        this.selectedItems.set([]);
      },
      () => {
        this.catalog.set([]);
        this.setScreenOptions([]);
        this.selectedItems.set([]);
      },
    );
  }

  async openCreateModal(): Promise<void> {
    const config = this.config();
    const route = this.apiRoute();

    if (!config || !route) {
      return;
    }

    const result = await this.modal.open<ICatalogModalData, ICatalogModalResult>({
      component: CatalogModalComponent,
      data: {
        title: config.title,
        collectionKey: config.collectionKey,
        item: null,
      },
      title: this.translate.instant(config.title),
      description: this.translate.instant('configuration.catalogs.messages.create-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    const payload = {
      ...result.payload,
      order: this.catalog().length,
    };

    this.executeMutationRequest(
      this.api.post<CatalogMutationResponse>(route, payload),
      (response) => {
        const createdItem = this.extractItem(response.data);

        if (!createdItem) {
          this.loadCatalog();
          return;
        }

        this.catalog.set(this.extractCollection(response.data, [...this.catalog(), createdItem]));
        this.selectedItems.set([]);
      },
    );
  }

  async openEditModal(item?: CatalogItem): Promise<void> {
    const config = this.config();
    const route = this.apiRoute();
    const selected = item ?? this.selectedItems()[0];

    if (!config || !route || !selected) {
      return;
    }

    const result = await this.modal.open<ICatalogModalData, ICatalogModalResult>({
      component: CatalogModalComponent,
      data: {
        title: config.title,
        collectionKey: config.collectionKey,
        item: selected,
      },
      title: this.translate.instant(config.title),
      description: this.translate.instant('configuration.catalogs.messages.edit-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.executeMutationRequest(
      this.api.put<CatalogMutationResponse>(`${route}/${selected.id}`, {
        ...result.payload,
        order: selected.order,
      }),
      (response) => {
        const updatedItem = this.extractItem(response.data);

        if (!updatedItem) {
          this.loadCatalog();
          return;
        }

        this.catalog.set(
          this.extractCollection(
            response.data,
            this.catalog().map((catalogItem) =>
              catalogItem.id === selected.id ? updatedItem : catalogItem,
            ),
          ),
        );

        this.selectedItems.set([]);
      },
    );
  }

  async deleteSelected(): Promise<void> {
    const selected = this.selectedItems()[0];

    if (!selected) {
      return;
    }

    await this.deleteItem(selected);
  }

  async deleteItem(item: CatalogItem): Promise<void> {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const confirmed = await this.modal.open<any, boolean>({
      component: SklConfirmModal as Type<unknown>,
      data: {
        message: this.translate.instant('configuration.catalogs.messages.confirm-delete'),
        confirmLabel: this.translate.instant('common.delete'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'danger',
      },
      title: this.translate.instant('configuration.catalogs.messages.delete-title'),
      size: 'sm',
      closeOnBackdrop: false,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) {
      return;
    }

    this.executeMutationRequest(
      this.api.delete<CatalogIndexResponse>(`${route}/${item.id}`),
      (response) => {
        const fallback = this.catalog().filter((catalogItem) => catalogItem.id !== item.id);

        this.catalog.set(this.extractCollection(response.data, fallback));
        this.selectedItems.set([]);
      },
    );
  }

  startOrdering(): void {
    this.orderingMode.set(true);
    this.selectedItems.set([]);
  }

  cancelOrdering(): void {
    this.orderingMode.set(false);
    this.selectedItems.set([]);
    this.loadCatalog();
  }

  onRowOrderChange(event: unknown): void {
    if (!Array.isArray(event)) {
      return;
    }

    this.catalog.set(
      (event as CatalogItem[]).map((item, index) => ({
        ...item,
        order: index,
      })),
    );
  }

  saveOrder(): void {
    const route = this.apiRoute();

    if (!route || this.savingOrder()) {
      return;
    }

    const ids = this.catalog().map((item) => item.id);

    this.savingOrder.set(true);

    this.executeSilentRequest<CatalogIndexResponse | CatalogItem[]>(
      this.api.put(`${route}/set-order`, { ids }),
      (response) => {
        this.handleApiSuccess(response);

        this.catalog.set(this.extractCollection(response.data, this.catalog()));
        this.orderingMode.set(false);
        this.selectedItems.set([]);
        this.savingOrder.set(false);
      },
      () => {
        this.savingOrder.set(false);
      },
    );
  }

  trackById(_: number, item: CatalogItem): number {
    return item.id;
  }

  private responseCollectionKey(): string {
    return this.config()?.collectionKey ?? '';
  }

  private responseItemKey(): string {
    return this.config()?.itemKey ?? '';
  }

  private extractCollection(data: unknown, fallback: CatalogItem[] = []): CatalogItem[] {
    if (Array.isArray(data)) {
      return this.sortCatalog(data as CatalogItem[]);
    }

    const key = this.responseCollectionKey();

    if (!key || !this.isRecord(data)) {
      return this.sortCatalog(fallback);
    }

    const collection = data[key];

    if (!Array.isArray(collection)) {
      return this.sortCatalog(fallback);
    }

    return this.sortCatalog(collection as CatalogItem[]);
  }

  private extractItem(data: unknown): CatalogItem | null {
    const key = this.responseItemKey();

    if (!key || !this.isRecord(data)) {
      return null;
    }

    const item = data[key];

    if (!this.isCatalogItem(item)) {
      return null;
    }

    return item;
  }

  private sortCatalog(items: CatalogItem[]): CatalogItem[] {
    return [...items].sort((a, b) => a.order - b.order);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  private isCatalogItem(value: unknown): value is CatalogItem {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      typeof value['id'] === 'number' &&
      typeof value['name'] === 'string' &&
      ('translation' in value
        ? typeof value['translation'] === 'string' || value['translation'] === null
        : true) &&
      typeof value['active'] === 'boolean' &&
      typeof value['order'] === 'number'
    );
  }
}
