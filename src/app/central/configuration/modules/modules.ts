import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ColDef, GetRowIdParams, ICellRendererParams } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { SklConfirmModal } from '../../../shared/base/skl-confirm-modal/skl-confirm-modal';
import { SkolansBaseComponent } from '../../../shared/base/skolans-base-component';
import { SkolansTable } from '../../../shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '../../../shared/ui/ui-button/ui-button';
import { UiIconComponent } from '../../../shared/ui/ui-icon/ui-icon';
import { ModuleModalComponent } from '../module-modal-component/module-modal-component';
import { ModuleListItem } from '../../../shared/interfaces/access.interfaces';


/**
 * Modal result contract used by the modules catalog screen.
 *
 * The modal always returns whether the action was saved, the form mode,
 * and the validated payload that must be sent to the backend.
 */
interface IModuleModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string;
    priv: boolean;
    icon: string;
    order: number;
    context: 'central' | 'tenant' | 'both';
  };
}

/**
 * Data returned by the modules index endpoint.
 */
interface ModulesIndexData {
  options?: Parameters<SkolansBaseComponent['setScreenOptions']>[0];
  modules?: ModuleListItem[];
}

/**
 * Flexible item payload used by create/update endpoints while backend response
 * shapes are being standardized.
 */
interface ModuleMutationData extends Partial<ModuleListItem> {
  module?: ModuleListItem;
  item?: ModuleListItem;
}

/**
 * Data returned by the set-order endpoint.
 */
interface ModulesOrderData {
  modules?: ModuleListItem[];
}

@Component({
  selector: 'app-module-icon-cell-renderer',
  standalone: true,
  imports: [CommonModule, UiIconComponent],
  template: `
    <div class="module-icon-cell" *ngIf="icon; else emptyIcon">
      <app-ui-icon [name]="icon" size="sm" />
      <span class="module-icon-cell__name">{{ icon }}</span>
    </div>

    <ng-template #emptyIcon>
      <span class="module-icon-cell__empty">—</span>
    </ng-template>
  `,
  styles: [
    `
      .module-icon-cell {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        min-width: 0;
      }

      .module-icon-cell__name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .module-icon-cell__empty {
        color: #9ca3af;
      }
    `,
  ],
})
class ModuleIconCellRenderer {
  protected icon = '';

  agInit(params: ICellRendererParams<ModuleListItem>): void {
    this.icon = params.data?.icon ?? '';
  }

  refresh(params: ICellRendererParams<ModuleListItem>): boolean {
    this.icon = params.data?.icon ?? '';
    return true;
  }
}

/**
 * Modules catalog screen.
 *
 * This component is responsible for managing the central configuration
 * modules catalog. It coordinates the reusable table wrapper, the screen
 * modals, and the API layer inherited from `SkolansBaseComponent`.
 *
 * Main responsibilities:
 * - Load modules from the backend using route metadata
 * - Configure AG Grid column definitions for normal and ordering modes
 * - Handle row selection state
 * - Open modal flows for create, update, and delete operations
 * - Persist manual ordering to the backend
 * - Keep the local signal-based state synchronized with API responses
 * - Navigate to the controllers screen as a drill-down action
 */
@Component({
  selector: 'app-modules',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './modules.html',
  styleUrl: './modules.scss',
})
export class Modules extends SkolansBaseComponent implements OnInit {
  private readonly router = inject(Router);

  /**
   * Signal containing the modules rendered by the table.
   *
   * This collection is the local source of truth for the current screen state
   * and is updated after loads, CRUD operations, and manual row reordering.
   */
  protected readonly modules = signal<ModuleListItem[]>([]);

  /**
   * Signal containing the rows currently selected in the table.
   *
   * Selection drives screen-level actions such as edit, delete, and drill-down.
   */
  protected readonly selectedModules = signal<ModuleListItem[]>([]);

  /**
   * True while the screen is in manual ordering mode.
   *
   * When enabled, the table switches from normal catalog mode to a drag-and-drop
   * workflow where sorting, filtering and pagination are intentionally relaxed.
   */
  protected readonly orderingMode = signal(false);

  /** True while the new order is being persisted in the backend. */
  protected readonly savingOrder = signal(false);

  /**
   * Indicates whether exactly one module is selected.
   *
   * Used to enable single-record actions like edit and drill-down.
   */
  protected readonly hasSingleSelection = computed(() => this.selectedModules().length === 1);

  /**
   * Pagination is disabled while drag ordering is active.
   *
   * Row dragging must work against the full visible collection, so pagination
   * is turned off temporarily during manual ordering mode.
   */
  protected readonly tablePagination = computed(() => !this.orderingMode());

  /**
   * Indicates whether the table currently has at least one selected row.
   */
  protected readonly hasSelection = computed(() => this.selectedModules().length > 0);

  /**
   * Computed AG Grid column definitions for the modules catalog.
   *
   * In normal mode, the grid supports sorting and filtering where appropriate.
   * In ordering mode, an extra drag column is prepended and interactive grid
   * features that interfere with drag-and-drop are disabled.
   */
  protected readonly columnDefs = computed<ColDef<ModuleListItem>[]>(() => {
    const ordering = this.orderingMode();

    const columns: ColDef<ModuleListItem>[] = [
      {
        field: 'name',
        headerValueGetter: () => this.translate.instant('configuration.modules.fields.name'),
        flex: 1,
        minWidth: 180,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'translation',
        headerValueGetter: () => this.translate.instant('configuration.modules.fields.translation'),
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
        field: 'priv',
        headerValueGetter: () => this.translate.instant('configuration.modules.fields.priv'),
        width: 130,
        minWidth: 130,
        sortable: !ordering,
        valueGetter: (params) => {
          const value = params.data?.priv;
          return Number(value) === 1
            ? this.translate.instant('common.yes')
            : this.translate.instant('common.no');
        },
        filter: ordering ? false : 'agTextColumnFilter',
        filterValueGetter: (params) => {
          const value = params.data?.priv;
          return Number(value) === 1
            ? this.translate.instant('common.yes')
            : this.translate.instant('common.no');
        },
        floatingFilter: !ordering,
      },
      {
        field: 'icon',
        headerValueGetter: () => this.translate.instant('configuration.modules.fields.icon'),
        flex: 1,
        minWidth: 180,
        sortable: !ordering,
        filter: false,
        floatingFilter: false,
        cellRenderer: ModuleIconCellRenderer,
      },
      {
        field: 'order',
        headerValueGetter: () => this.translate.instant('configuration.modules.fields.order'),
        width: 110,
        minWidth: 110,
        sortable: !ordering,
        filter: false,
        floatingFilter: false,
      },
      {
        field: 'context',
        headerValueGetter: () => this.translate.instant('configuration.modules.fields.context'),
        width: 140,
        minWidth: 140,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
        valueGetter: (params) => {
          const value = params.data?.context;
          return value ? this.translate.instant(`configuration.modules.contexts.${value}`) : '';
        },
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

  /**
   * Extracts a valid module item from flexible mutation endpoint payloads.
   */
  private extractModuleFromMutationData(data: ModuleMutationData): ModuleListItem | null {
    const candidate = data.module ?? data.item ?? data;

    if (
      !candidate ||
      typeof candidate.id !== 'number' ||
      typeof candidate.name !== 'string' ||
      typeof candidate.translation !== 'string'
    ) {
      return null;
    }

    return candidate as ModuleListItem;
  }

  /**
   * Handles row selection changes emitted by the reusable table component.
   *
   * @param rows Selected table rows emitted by the wrapper component.
   */
  protected onSelectionChange(rows: unknown[]): void {
    this.selectedModules.set(rows as ModuleListItem[]);
  }

  /**
   * Returns a stable string identifier for each grid row.
   *
   * AG Grid uses this identity to preserve row tracking while drag ordering is
   * active and the local array changes position.
   *
   * @param params AG Grid row identification parameters.
   * @returns Stable row identifier.
   */
  protected readonly getRowId = (params: GetRowIdParams<ModuleListItem>): string => {
    return String(params.data.id);
  };

  /**
   * Activates manual ordering mode.
   *
   * Once enabled, row selection is cleared and the table switches to a drag-
   * and-drop workflow where the user can visually reorder modules.
   */
  protected startOrdering(): void {
    this.orderingMode.set(true);
    this.selectedModules.set([]);
  }

  /**
   * Cancels manual ordering mode.
   *
   * The current unsaved visual order is discarded and the modules catalog is
   * reloaded from the backend to restore the persisted sequence.
   */
  protected cancelOrdering(): void {
    this.orderingMode.set(false);
    this.selectedModules.set([]);
    this.reloadModules();
  }

  /**
   * Applies the row order emitted after a drag-and-drop interaction.
   *
   * The reusable table wrapper emits the reordered collection once AG Grid
   * finishes the drag operation, and that sequence becomes the temporary local
   * order until the user saves or cancels.
   *
   * @param rows Ordered rows emitted by the table wrapper.
   */
  protected onRowOrderChange(rows: unknown[]): void {
    const ordered = rows as ModuleListItem[];
    this.modules.set(ordered);
  }

  /**
   * Persists the current module order in the backend.
   *
   * Only the ordered list of module IDs is sent because the backend is
   * responsible for recalculating and storing the final `order` values.
   */
  protected saveOrder(): void {
    const route = this.apiRoute();

    if (!route || this.savingOrder()) {
      return;
    }
    /**
     * The backend only needs the final sequence of identifiers.
     */
    const ids = this.modules().map((item) => item.id);

    this.savingOrder.set(true);

    this.request(this.api.put<ModulesOrderData | ModuleListItem[]>(`${route}/set-order`, { ids })).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }
        this.handleApiSuccess(res);
        const modules = Array.isArray(res.data)
          ? res.data
          : res.data?.modules ?? this.modules();
        this.modules.set([...modules].sort((a, b) => a.order - b.order));
        this.orderingMode.set(false);
        this.selectedModules.set([]);
      },
      error: () => this.ignoreHandledRequestError(),
      complete: () => {
        this.savingOrder.set(false);
      },
    });
  }

  /**
   * Opens the create-module modal and persists the new record.
   *
   * The modal returns validated form data only. This screen remains responsible
   * for sending the payload to the API and reconciling the local collection.
   */
  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<Partial<IModuleModalResult['payload']>, IModuleModalResult>({
      component: ModuleModalComponent,
      data: {
        order: this.modules().length,
      },
      title: this.translate.instant('configuration.modules.add'),
      description: this.translate.instant('configuration.modules.messages.create-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.request(this.api.post<ModuleMutationData>(route, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }
        const createdModule = this.extractModuleFromMutationData(res.data);
        if (!createdModule) {
          this.reloadModules();
          return;
        }
        this.handleApiSuccess(res);
        this.modules.update((current) => [...current, createdModule]);
        this.modules.update((current) => [...current].sort((a, b) => a.order - b.order));
        this.selectedModules.set([]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Opens the edit-module modal for the currently selected record.
   *
   * The operation only proceeds when exactly one row is selected.
   */
  protected async onEdit(): Promise<void> {
    const selected = this.selectedModules();

    if (selected.length !== 1) {
      return;
    }

    const module = selected[0];
    const route = this.apiRoute();

    if (!route || !module.id) {
      return;
    }

    const result = await this.modal.open<ModuleListItem, IModuleModalResult>({
      component: ModuleModalComponent,
      data: module,
      title: this.translate.instant('configuration.modules.update'),
      description: this.translate.instant('configuration.modules.messages.update-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.request(this.api.put<ModuleMutationData>(`${route}/${module.id}`, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }
        const updatedModule = this.extractModuleFromMutationData(res.data);
        if (!updatedModule) {
          this.reloadModules();
          return;
        }
        this.handleApiSuccess(res);
        this.modules.update((current) =>
          current.map((item) => (item.id === updatedModule.id ? updatedModule : item)),
        );
        this.modules.update((current) => [...current].sort((a, b) => a.order - b.order));
        this.selectedModules.set([updatedModule]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Confirms and deletes the currently selected module.
   *
   * After a successful deletion, the local signal is updated immediately and
   * the catalog is reloaded to guarantee ordering consistency.
   */
  protected async onDelete(): Promise<void> {
    const selected = this.selectedModules();

    if (selected.length !== 1) {
      return;
    }

    const module = selected[0];
    const route = this.apiRoute();

    if (!route || !module.id) {
      return;
    }

    const confirmed = await this.modal.open<
      {
        message: string;
        confirmLabel: string;
        cancelLabel: string;
        type: 'danger';
      },
      boolean
    >({
      component: SklConfirmModal,
      title: this.translate.instant('configuration.modules.delete'),
      data: {
        message: this.translate.instant('configuration.modules.messages.confirm-delete'),
        confirmLabel: this.translate.instant('common.delete'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'danger',
      },
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) {
      return;
    }

    this.request(this.api.delete<unknown>(`${route}/${module.id}`)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }
        this.handleApiSuccess(res);
        this.modules.update((current) => current.filter((item) => item.id !== module.id));
        this.reloadModules();
        this.selectedModules.set([]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }


  /**
   * Loads or reloads the modules catalog from the backend.
   *
   * This method is used on initial screen load and as a safe fallback whenever
   * a mutation response does not include enough entity data to reconcile the
   * local state deterministically.
   */
  protected reloadModules(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.clearScreenOptions();
    this.request(this.api.get<ModulesIndexData | ModuleListItem[]>(route)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }
        const modules = Array.isArray(res.data)
          ? res.data
          : res.data?.modules ?? [];
        this.setScreenOptions(Array.isArray(res.data) ? undefined : res.data?.options);
        this.modules.set([...modules].sort((a, b) => a.order - b.order));
        this.selectedModules.set([]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Navigates to the controllers catalog of the selected module.
   *
   * Drill-down is only available when exactly one module is selected.
   */
  protected onDrilldown(): void {
    const selected = this.selectedModules();

    if (selected.length !== 1) {
      return;
    }

    const module = selected[0];

    this.router.navigate([module.id, 'controllers'], {
      relativeTo: this.activatedRoute,
    });
  }

  /**
   * Initializes route metadata and performs the first catalog load.
   */
  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadModules();
  }
}
