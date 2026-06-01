import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ColDef, GetRowIdParams, ICellRendererParams } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '../../../shared/base/skolans-base-component';
import {
  ActionModalComponent,
  IActionModalResult,
} from '../action-modal-component/action-modal-component';
import { ControllerStackService } from '../../../shared/services/controller-stack-service';
import { UiButtonComponent } from '../../../shared/ui/ui-button/ui-button';
import { UiIconComponent } from '../../../shared/ui/ui-icon/ui-icon';
import { SkolansTable } from '../../../shared/ui/skolans-table/skolans-table';
import { SklConfirmModal } from '../../../shared/base/skl-confirm-modal/skl-confirm-modal';
import {
  ActionListItem,
  ModuleListItem,
} from '../../../shared/interfaces/configuration.interfaces';

type ActionModalData = Partial<ActionListItem> & {
  moduleName?: string | null;
  controllerName?: string | null;
};

/**
 * API payload returned by the actions index endpoint.
 *
 * The backend normally returns the controller context and the ordered action list.
 * The component still accepts a plain array fallback to remain compatible with
 * older or transitional response shapes while the CRUD standard is applied
 * across all central catalogs.
 */
interface ActionsIndexData {
  controller?: {
    id: number;
    name: string;
    translation: string;
    priv: boolean | number;
    visible: boolean | number;
    icon: string;
    order: number;
    context: 'central' | 'tenant' | 'both';
    parent_id: number | null;
    module_id: number;
    has_children?: boolean;
    module?: ModuleListItem | null;
  } | null;
  actions?: ActionListItem[];
}

/**
 * Flexible mutation payload used by create/update endpoints.
 *
 * Some endpoints may return the record directly, while others may wrap it under
 * `action` or `item`. The component normalizes those shapes through
 * `extractActionFromMutationData` before updating local state.
 */
interface ActionMutationData extends Partial<ActionListItem> {
  action?: ActionListItem;
  item?: ActionListItem;
}

@Component({
  selector: 'app-action-icon-cell-renderer',
  standalone: true,
  imports: [CommonModule, UiIconComponent],
  template: `
    <div class="action-icon-cell" *ngIf="icon; else emptyIcon">
      <app-ui-icon [name]="icon" size="sm" />
      <span class="action-icon-cell__name">{{ icon }}</span>
    </div>

    <ng-template #emptyIcon>
      <span class="action-icon-cell__empty">—</span>
    </ng-template>
  `,
  styles: [
    `
      .action-icon-cell {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        min-width: 0;
      }

      .action-icon-cell__name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .action-icon-cell__empty {
        color: #9ca3af;
      }
    `,
  ],
})
class ActionIconCellRenderer {
  protected icon = '';

  agInit(params: ICellRendererParams<ActionListItem>): void {
    this.icon = params.data?.icon ?? '';
  }

  refresh(params: ICellRendererParams<ActionListItem>): boolean {
    this.icon = params.data?.icon ?? '';
    return true;
  }
}

/**
 * Actions catalog screen.
 *
 * This component manages the actions catalog of the currently selected
 * controller. It coordinates the reusable table wrapper, modal flows,
 * temporary ordering mode, and the API layer inherited from
 * `SkolansBaseComponent`.
 *
 * Main responsibilities:
 * - Resolve route metadata and backend endpoint
 * - Load actions for the selected controller
 * - Keep selection state for toolbar actions
 * - Expose contextual information about the active controller
 * - Configure AG Grid column definitions for normal and ordering modes
 * - Open create, update, and delete modal flows
 * - Persist manual ordering inside the current controller scope
 * - Create default actions for the active controller
 *
 * CRUD conventions implemented here:
 * - All API responses use the official `{ success, data, message }` envelope.
 * - Logical failures (`success: false`) are shown through `ToastService`.
 * - HTTP/transport errors are normalized globally by `ApiService`.
 * - Create/update responses are normalized from flexible mutation payloads.
 * - Delete confirmation uses `SklConfirmModal` with the title in the modal host.
 * - Save-order supports backends that return `null`, a plain array, or `{ actions }`.
 */
@Component({
  selector: 'app-actions',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './actions.html',
  styleUrl: './actions.scss',
})
export class Actions extends SkolansBaseComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly controllerStack = inject(ControllerStackService);

  /**
   * Signal containing the actions rendered in the table.
   *
   * This collection is the local source of truth for the current controller
   * scope and is updated after loads, CRUD operations, default creation, and
   * manual reordering.
   */
  protected readonly actions = signal<ActionListItem[]>([]);

  /**
   * Signal containing the actions currently selected in the table.
   *
   * Selection drives toolbar actions such as edit and delete.
   */
  protected readonly selectedActions = signal<ActionListItem[]>([]);

  /**
   * Controller context returned by the backend for the current actions screen.
   */
  protected readonly controller = signal<{
    id: number;
    name: string;
    translation: string;
    priv: boolean | number;
    visible: boolean | number;
    icon: string;
    order: number;
    context: 'central' | 'tenant' | 'both';
    parent_id: number | null;
    module_id: number;
    has_children?: boolean;
    module?: ModuleListItem | null;
  } | null>(null);

  /**
   * Indicates whether the screen is currently in manual ordering mode.
   */
  protected readonly orderingMode = signal(false);

  /**
   * Indicates whether the reordered action sequence is being persisted.
   */
  protected readonly savingOrder = signal(false);

  /**
   * Module identifier resolved from the active route parameters.
   */
  protected readonly moduleId = computed<number | null>(() => {
    const value = this.route.snapshot.paramMap.get('moduleId');
    return value ? Number(value) : null;
  });

  /**
   * Controller identifier resolved from the active route parameters.
   */
  protected readonly controllerId = computed<number | null>(() => {
    const value = this.route.snapshot.paramMap.get('controllerId');
    return value ? Number(value) : null;
  });

  /**
   * Indicates whether the table currently has at least one selected row.
   */
  protected readonly hasSelection = computed(() => this.selectedActions().length > 0);

  /**
   * Indicates whether exactly one action is selected.
   */
  protected readonly hasSingleSelection = computed(() => this.selectedActions().length === 1);

  /**
   * Enables normal table pagination only when ordering mode is inactive.
   */
  protected readonly tablePagination = computed(() => !this.orderingMode());

  /**
   * Current controller label shown in the UI.
   *
   * Priority:
   * 1. Controller returned by the actions API.
   * 2. In-memory controller stack fallback.
   */
  protected readonly currentControllerName = computed(() => {
    const controller = this.controller();

    if (controller?.name) {
      return controller.name;
    }

    const current = this.controllerStack.current();
    return current?.name ?? null;
  });

  /**
   * Current module label shown in the UI.
   *
   * Priority:
   * 1. Module returned inside the current controller payload.
   * 2. Module id route fallback.
   */
  protected readonly currentModuleName = computed(() => {
    const controller = this.controller();

    if (controller?.module?.name) {
      return controller.module.name;
    }

    const moduleId = this.moduleId();
    return moduleId ? `#${moduleId}` : null;
  });

  /**
   * Computed AG Grid column definitions for the actions catalog.
   *
   * The first column enables drag behavior only while manual ordering mode is
   * active, so the same table definition can support both browsing and
   * reordering workflows.
   */
  protected readonly columnDefs = computed<ColDef<ActionListItem>[]>(() => [
    {
      field: 'name',
      headerName: this.translate.instant('configuration.actions.fields.name'),
      flex: 1,
      rowDrag: this.orderingMode(),
    },
    {
      field: 'translation',
      headerName: this.translate.instant('configuration.actions.fields.translation'),
      flex: 1,
      valueGetter: (params) => {
        const key = params.data?.translation;
        return key ? this.translate.instant(key) : '';
      },
    },
    {
      field: 'icon',
      headerName: this.translate.instant('configuration.actions.fields.icon'),
      width: 180,
      cellRenderer: ActionIconCellRenderer,
    },
    {
      field: 'color',
      headerName: this.translate.instant('configuration.actions.fields.color'),
      width: 120,
    },
    {
      field: 'priv',
      headerName: this.translate.instant('configuration.actions.fields.priv'),
      width: 100,
      valueGetter: (params) => (params.data?.priv ? 'Sí' : 'No'),
    },
  ]);

  /**
   * Returns a stable string identifier for each action row.
   *
   * @param params AG Grid row identification parameters.
   * @returns Stable row identifier.
   */
  protected readonly getRowId = (params: GetRowIdParams<ActionListItem>): string => {
    return String(params.data.id);
  };

  /**
   * Extracts a valid action item from flexible mutation endpoint payloads.
   *
   * This protects the local table state from partial or unexpected backend
   * payloads. If the response cannot be normalized into a valid action item,
   * the caller falls back to reloading the catalog from the backend.
   */
  private extractActionFromMutationData(data: ActionMutationData): ActionListItem | null {
    const candidate = data.action ?? data.item ?? data;

    if (
      !candidate ||
      typeof candidate.id !== 'number' ||
      typeof candidate.name !== 'string' ||
      typeof candidate.translation !== 'string'
    ) {
      return null;
    }

    return candidate as ActionListItem;
  }

  /**
   * Initializes route metadata and performs the first catalog load.
   */
  ngOnInit(): void {
    this.initRouteMeta();
    this.loadActions();
  }

  /**
   * Loads actions from the backend for the current controller.
   *
   * Also refreshes the controller context and clears local selection so toolbar
   * actions never operate on stale rows after navigation or reloads.
   */
  protected loadActions(): void {
    const route = this.apiRoute();
    const controllerId = this.controllerId();

    if (!route || !controllerId) {
      return;
    }

    const query = `controller_id=${controllerId}`;

    this.request(this.api.get<ActionsIndexData | ActionListItem[]>(`${route}?${query}`)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const actions = Array.isArray(res.data) ? res.data : (res.data?.actions ?? []);

        this.controller.set(Array.isArray(res.data) ? null : (res.data?.controller ?? null));
        this.actions.set([...actions].sort((a, b) => a.order - b.order));
        this.selectedActions.set([]);
      },
      error: () => {
        this.controller.set(null);
      },
    });
  }

  /**
   * Handles row selection changes emitted by the reusable table component.
   *
   * @param rows Selected rows emitted by the table wrapper.
   */
  protected onSelectionChange(rows: unknown[]): void {
    this.selectedActions.set(rows as ActionListItem[]);
  }

  /**
   * Activates manual ordering mode for the current controller action list.
   */
  protected startOrdering(): void {
    this.orderingMode.set(true);
    this.selectedActions.set([]);
  }

  /**
   * Cancels manual ordering mode and restores the persisted action order.
   */
  protected cancelOrdering(): void {
    this.orderingMode.set(false);
    this.loadActions();
  }

  /**
   * Applies the row order emitted after a drag-and-drop interaction.
   *
   * @param rows Ordered rows emitted by the table wrapper.
   */
  protected onRowOrderChange(rows: unknown[]): void {
    this.actions.set(rows as ActionListItem[]);
  }

  /**
   * Persists the current visual order in the backend.
   *
   * The backend only needs the ordered identifiers and the active controller
   * context to recalculate the stored action order.
   *
   * The response is intentionally handled flexibly because the backend may
   * return `null` after saving. In that case, the current visual order remains
   * the source of truth and only the local `order` indexes are normalized.
   */
  protected saveOrder(): void {
    const route = this.apiRoute();
    const controllerId = this.controllerId();

    if (!route || !controllerId || this.savingOrder()) {
      return;
    }

    /**
     * The backend needs the final sequence of identifiers scoped to the
     * current controller.
     */
    const payload = {
      ids: this.actions().map((item) => item.id),
      controller_id: controllerId,
    };

    this.savingOrder.set(true);

    this.request(
      this.api.put<ActionsIndexData | ActionListItem[] | null>(`${route}/save-order`, payload),
    ).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);

        const actions = Array.isArray(res.data) ? res.data : (res.data?.actions ?? this.actions());

        this.actions.set(
          actions.map((item, index) => ({
            ...item,
            order: index,
          })),
        );

        this.orderingMode.set(false);
        this.selectedActions.set([]);
      },
      error: () => this.ignoreHandledRequestError(),
      complete: () => {
        this.savingOrder.set(false);
      },
    });
  }

  /**
   * Opens the create-action modal and persists the new record.
   *
   * The new action is always created inside the currently selected controller.
   */
  protected async onAdd(): Promise<void> {
    const route = this.apiRoute();
    const controllerId = this.controllerId();

    if (!route || !controllerId) {
      return;
    }

    const result = await this.modal.open<ActionModalData, IActionModalResult>({
      component: ActionModalComponent,
      data: {
        controller_id: controllerId,
        order: this.actions().length,
        priv: false,
        moduleName: this.currentModuleName(),
        controllerName: this.currentControllerName(),
      },
      title: this.translate.instant('configuration.actions.add'),
      description: this.translate.instant('configuration.actions.messages.create-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    const payload = result.payload;

    this.request(this.api.post<ActionMutationData>(route, payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const createdAction = this.extractActionFromMutationData(res.data);

        if (!createdAction) {
          this.loadActions();
          return;
        }

        this.handleApiSuccess(res);
        this.actions.update((current) => [...current, createdAction]);
        this.actions.update((current) => [...current].sort((a, b) => a.order - b.order));
        this.selectedActions.set([]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Opens the edit-action modal for the currently selected record.
   *
   * The operation only proceeds when exactly one row is selected.
   */
  protected async onEdit(): Promise<void> {
    const selected = this.selectedActions();

    if (selected.length !== 1) {
      return;
    }

    const action = selected[0];
    const route = this.apiRoute();

    if (!route || !action.id) {
      return;
    }

    const result = await this.modal.open<ActionModalData, IActionModalResult>({
      component: ActionModalComponent,
      data: {
        ...action,
        moduleName: this.currentModuleName(),
        controllerName: this.currentControllerName(),
      },
      title: this.translate.instant('configuration.actions.update'),
      description: this.translate.instant('configuration.actions.messages.update-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.request(
      this.api.put<ActionMutationData>(`${route}/${action.id}`, result.payload),
    ).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const updatedAction = this.extractActionFromMutationData(res.data);

        if (!updatedAction) {
          this.loadActions();
          return;
        }

        this.handleApiSuccess(res);
        this.actions.update((current) =>
          current.map((item) => (item.id === updatedAction.id ? updatedAction : item)),
        );
        this.actions.update((current) => [...current].sort((a, b) => a.order - b.order));
        this.selectedActions.set([updatedAction]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Confirms and deletes the currently selected action.
   *
   * After deletion, the catalog is reloaded to keep the persisted order fully
   * synchronized with the local table state.
   */
  protected async onDelete(): Promise<void> {
    const selected = this.selectedActions();

    if (selected.length !== 1) {
      return;
    }

    const action = selected[0];
    const route = this.apiRoute();

    if (!route || !action.id) {
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
      title: this.translate.instant('configuration.actions.delete'),
      data: {
        message: this.translate.instant('configuration.actions.messages.confirm-delete'),
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

    this.request(this.api.delete<unknown>(`${route}/${action.id}`)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);
        this.actions.update((current) => current.filter((item) => item.id !== action.id));
        this.loadActions();
        this.selectedActions.set([]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Creates the default actions for the current controller.
   *
   * After a successful response, the table adopts the reordered collection
   * returned by the backend as the new local source of truth.
   *
   * This flow is specific to actions because every controller can quickly
   * receive a standard baseline of `add`, `update`, and `delete` operations.
   */
  protected async onDefaults(): Promise<void> {
    const route = this.apiRoute();
    const controllerId = this.controllerId();

    if (!route || !controllerId) {
      return;
    }

    const confirmed = await this.modal.open<
      {
        message: string;
        confirmLabel: string;
        cancelLabel: string;
        type: 'warning';
      },
      boolean
    >({
      component: SklConfirmModal,
      title: this.translate.instant('configuration.actions.defaults'),
      data: {
        message: this.translate.instant('configuration.actions.messages.confirm-defaults'),
        confirmLabel: this.translate.instant('configuration.actions.defaults'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'warning',
      },
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) {
      return;
    }

    const payload = {
      controller_id: controllerId,
    };

    this.request(
      this.api.post<ActionsIndexData | ActionListItem[]>(`${route}/create-defaults`, payload),
    ).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);

        const actions = Array.isArray(res.data) ? res.data : (res.data?.actions ?? []);
        this.actions.set(actions);
        this.actions.update((current) => [...current].sort((a, b) => a.order - b.order));

        this.selectedActions.set([]);
      },
      error: () => {},
    });
  }
}
