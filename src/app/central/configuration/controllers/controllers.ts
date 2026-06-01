import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ColDef, GetRowIdParams, ICellRendererParams } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';
import { ControllerStackService } from '../../../shared/services/controller-stack-service';
import { ControllerListItem, ModuleListItem } from '../../../shared/interfaces/configuration.interfaces';

import { SkolansBaseComponent } from '../../../shared/base/skolans-base-component';
import { UiButtonComponent } from '../../../shared/ui/ui-button/ui-button';
import { UiIconComponent } from '../../../shared/ui/ui-icon/ui-icon';
import { SkolansTable } from '../../../shared/ui/skolans-table/skolans-table';
import { ControllerModalComponent } from '../controller-modal-component/controller-modal-component';
import { SklConfirmModal } from '../../../shared/base/skl-confirm-modal/skl-confirm-modal';


/**
 * Modal result contract used by the controllers catalog screen.
 *
 * The modal returns whether the operation was saved, the form mode,
 * and the validated payload that must be sent to the backend.
 */
interface IControllerModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string;
    priv: boolean;
    visible: boolean;
    icon: string;
    order: number;
    context: 'central' | 'tenant' | 'both';
    parent_id: number | null;
    module_id: number;
  };
}

/**
 * Data returned by the controllers index endpoint.
 */
interface ControllersIndexData {
  options?: Parameters<SkolansBaseComponent['setScreenOptions']>[0];
  module?: ModuleListItem | null;
  controllers?: ControllerListItem[];
}

/**
 * Flexible item payload used by create/update endpoints while backend response
 * shapes are being standardized.
 */
interface ControllerMutationData extends Partial<ControllerListItem> {
  controller?: ControllerListItem;
  item?: ControllerListItem;
}

@Component({
  selector: 'app-controller-icon-cell-renderer',
  standalone: true,
  imports: [CommonModule, UiIconComponent],
  template: `
    <div class="controller-icon-cell" *ngIf="icon; else emptyIcon">
      <app-ui-icon [name]="icon" size="sm" />
      <span class="controller-icon-cell__name">{{ icon }}</span>
    </div>

    <ng-template #emptyIcon>
      <span class="controller-icon-cell__empty">—</span>
    </ng-template>
  `,
  styles: [
    `
      .controller-icon-cell {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        min-width: 0;
      }

      .controller-icon-cell__name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .controller-icon-cell__empty {
        color: #9ca3af;
      }
    `,
  ],
})
class ControllerIconCellRenderer {
  protected icon = '';

  agInit(params: ICellRendererParams<ControllerListItem>): void {
    this.icon = params.data?.icon ?? '';
  }

  refresh(params: ICellRendererParams<ControllerListItem>): boolean {
    this.icon = params.data?.icon ?? '';
    return true;
  }
}

/**
 * Controllers catalog screen.
 *
 * This component manages the controllers catalog of a selected module and
 * supports in-screen hierarchical navigation through parent and child
 * controllers. It coordinates the reusable table wrapper, modal flows,
 * temporary ordering mode, and the API layer inherited from
 * `SkolansBaseComponent`.
 *
 * Main responsibilities:
 * - Load controllers for the current module and hierarchy level
 * - Keep the active tree branch in memory through `ControllerStackService`
 * - Configure AG Grid column definitions for normal and ordering modes
 * - Handle row selection state
 * - Open create, update, and delete modal flows
 * - Persist manual ordering within the active sibling group
 * - Navigate deeper into controller children inside the same screen
 * - Navigate to the actions catalog for a selected controller
 */
@Component({
  selector: 'app-controllers',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './controllers.html',
  styleUrl: './controllers.scss',
})
export class Controllers extends SkolansBaseComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly controllerStack = inject(ControllerStackService);
  private readonly router = inject(Router);

  /**
   * Signal containing the controllers rendered in the current table level.
   *
   * This collection is the local source of truth for the active hierarchy
   * level and is updated after loads, CRUD operations, and manual reordering.
   */
  protected readonly controllers = signal<ControllerListItem[]>([]);

  /**
   * Module context returned by the backend for the current controllers screen.
   */
  protected readonly module = signal<ModuleListItem | null>(null);

  /**
   * Human-readable module label derived from the current module context.
   */
  protected readonly moduleName = computed(() => this.module()?.translation ?? null);
  

  /**
   * Signal containing the controllers currently selected in the table.
   *
   * Selection drives actions such as edit, delete, drill-down, and actions
   * navigation.
   */
  protected readonly selectedControllers = signal<ControllerListItem[]>([]);

  /**
   * Indicates whether the screen is currently in manual ordering mode.
   */
  protected readonly orderingMode = signal(false);

  /**
   * Indicates whether the reordered controller sequence is being persisted.
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
   * Active parent controller for the current in-screen tree level.
   *
   * This value is not taken from the route. The hierarchy is kept in memory
   * while the user remains inside the controllers/actions flow.
   */
  protected readonly activeParentId = signal<number | null>(null);

  /**
   * Indicates whether the table currently has at least one selected row.
   */
  protected readonly hasSelection = computed(() => this.selectedControllers().length > 0);

  /**
   * Indicates whether exactly one controller is selected.
   */
  protected readonly hasSingleSelection = computed(() => this.selectedControllers().length === 1);

  /**
   * Enables normal table pagination only when ordering mode is inactive.
   */
  protected readonly tablePagination = computed(() => !this.orderingMode());

  /**
   * Indicates whether the current controller tree can navigate one level up.
   */
  protected readonly canGoBack = computed(() => this.controllerStack.hasItems());

  /**
   * Name of the active parent controller shown while browsing child levels.
   */
  protected readonly currentParentName = computed(() => {
    const activeParentId = this.activeParentId();
    if (!activeParentId) {
      return null;
    }

    const match = this.controllerStack.stack().find((item) => item.id === activeParentId);
    return match?.name ?? null;
  });

  /**
   * Computed AG Grid column definitions for the controllers catalog.
   *
   * The first column enables drag behavior only while manual ordering mode is
   * active, so the same table definition can support both browsing and
   * reordering workflows.
   */
  protected readonly columnDefs = computed<ColDef<ControllerListItem>[]>(() => [
    {
      field: 'name',
      headerName: this.translate.instant('configuration.controllers.fields.name'),
      flex: 1,
      rowDrag: this.orderingMode(),
      filter: this.orderingMode() ? false : 'agTextColumnFilter',
        floatingFilter: !this.orderingMode(),
    },
    {
      field: 'translation',
      headerName: this.translate.instant('configuration.controllers.fields.translation'),
      flex: 1,
      valueGetter: (params) => {
        const key = params.data?.translation;
        return key ? this.translate.instant(key) : '';
      },
    },
    {
      field: 'icon',
      headerName: this.translate.instant('configuration.controllers.fields.icon'),
      width: 180,
      cellRenderer: ControllerIconCellRenderer,
    },
    {
      field: 'priv',
      headerName: this.translate.instant('configuration.controllers.fields.priv'),
      width: 140,
      valueGetter: (params) => {
        return params.data?.priv
          ? this.translate.instant('common.yes')
          : this.translate.instant('common.no');
      },
    },
    {
      field: 'context',
      headerName: this.translate.instant('configuration.controllers.fields.context'),
      width: 140,
      sortable: !this.orderingMode(),
      filter: this.orderingMode() ? false : 'agTextColumnFilter',
      floatingFilter: !this.orderingMode(),
      valueGetter: (params) => {
        const value = params.data?.context;
        return value ? this.translate.instant(`configuration.controllers.contexts.${value}`) : '';
      },
    },
  ]);

  /**
   * Returns a stable string identifier for each controller row.
   *
   * @param params AG Grid row identification parameters.
   * @returns Stable row identifier.
   */
  protected readonly getRowId = (params: GetRowIdParams<ControllerListItem>): string => {
    return String(params.data.id);
  };

  /**
   * Extracts a valid controller item from flexible mutation endpoint payloads.
   */
  private extractControllerFromMutationData(data: ControllerMutationData): ControllerListItem | null {
    const candidate = data.controller ?? data.item ?? data;

    if (
      !candidate ||
      typeof candidate.id !== 'number' ||
      typeof candidate.name !== 'string' ||
      typeof candidate.translation !== 'string'
    ) {
      return null;
    }

    return candidate as ControllerListItem;
  }

  /**
   * Initializes route metadata, restores the active tree context when
   * returning from actions, and performs the first catalog load.
   */
  ngOnInit(): void {
    this.initRouteMeta();

    const current = this.controllerStack.current();
    const moduleId = this.moduleId();

    // When entering from modules, start a fresh tree context.
    // When returning from actions, restore the deepest controller from the stack.
    if (!current || current.module_id !== moduleId) {
      this.controllerStack.reset();
      this.activeParentId.set(null);
    } else {
      this.activeParentId.set(current.id);
    }

    this.loadControllers();
  }

  /**
   * Loads controllers from the backend for the active hierarchy level.
   *
   * Root level uses `module_id`, while drill-down levels use `parent_id` so the
   * same screen can render either top-level controllers or controller children.
   */
  protected loadControllers(): void {
    const route = this.apiRoute();
    const moduleId = this.moduleId();
    const parentControllerId = this.activeParentId();

    if (!route || !moduleId) {
      return;
    }

    const query = parentControllerId
      ? `parent_id=${parentControllerId}&module_id=${moduleId}`
      : `module_id=${moduleId}`;

    this.request(this.api.get<ControllersIndexData | ControllerListItem[]>(`${route}?${query}`)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const controllers = Array.isArray(res.data)
          ? res.data
          : res.data?.controllers ?? [];

        this.setScreenOptions(Array.isArray(res.data) ? undefined : res.data?.options);
        this.module.set(Array.isArray(res.data) ? null : res.data?.module ?? null);
        this.controllers.set([...controllers].sort((a, b) => a.order - b.order));
        this.selectedControllers.set([]);
      },
      error: () => {
        this.module.set(null);
      },
    });
  }

  /**
   * Handles row selection changes emitted by the reusable table component.
   *
   * The reusable table emits `unknown[]`, so the screen normalizes the payload
   * to the controller row shape before storing it locally.
   *
   * @param rows Selected rows emitted by the table wrapper.
   */
  protected onSelectionChange(rows: unknown[]): void {
    this.selectedControllers.set(rows as ControllerListItem[]);
  }

  /**
   * Activates manual ordering mode for the current controller level.
   */
  protected startOrdering(): void {
    this.orderingMode.set(true);
    this.selectedControllers.set([]);
  }

  /**
   * Cancels manual ordering mode and reloads the current hierarchy level.
   */
  protected cancelOrdering(): void {
    this.orderingMode.set(false);
    this.loadControllers();
  }

  /**
   * Applies the row order emitted after a drag-and-drop interaction.
   *
   * @param rows Ordered rows emitted by the table wrapper.
   */
  protected onRowOrderChange(rows: unknown[]): void {
    this.controllers.set(rows as ControllerListItem[]);
  }

  /**
   * Opens the create-controller modal and persists the new record.
   *
   * The new controller is created inside the currently active module and, when
   * applicable, under the active parent controller level.
   */
  protected async onAdd(): Promise<void> {
    const route = this.apiRoute();
    const moduleId = this.moduleId();
    const parentId = this.activeParentId();

    if (!route || !moduleId) {
      return;
    }

    const result = await this.modal.open<Partial<ControllerListItem>, IControllerModalResult>({
      component: ControllerModalComponent,
      data: {
        module_id: moduleId,
        parent_id: parentId ?? null,
        visible: true,
        context: 'tenant',
      },
      title: this.translate.instant('configuration.controllers.add'),
      description: this.translate.instant('configuration.controllers.messages.create-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    const payload = result.payload;

    this.request(this.api.post<ControllerMutationData>(route, payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const createdController = this.extractControllerFromMutationData(res.data);

        if (!createdController) {
          this.loadControllers();
          return;
        }

        this.handleApiSuccess(res);
        this.controllers.update((current) => [...current, createdController]);
        this.controllers.update((current) => [...current].sort((a, b) => a.order - b.order));
        this.selectedControllers.set([]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Opens the edit-controller modal for the currently selected record.
   *
   * The operation only proceeds when exactly one row is selected.
   */
  protected async onEdit(): Promise<void> {
    const selected = this.selectedControllers();

    if (selected.length !== 1) {
      return;
    }

    const controller = selected[0];
    const route = this.apiRoute();

    if (!route || !controller.id) {
      return;
    }

    const result = await this.modal.open<ControllerListItem, IControllerModalResult>({
      component: ControllerModalComponent,
      data: controller,
      title: this.translate.instant('configuration.controllers.update'),
      description: this.translate.instant('configuration.controllers.messages.update-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.request(this.api.put<ControllerMutationData>(`${route}/${controller.id}`, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const updatedController = this.extractControllerFromMutationData(res.data);

        if (!updatedController) {
          this.loadControllers();
          return;
        }

        this.handleApiSuccess(res);
        this.controllers.update((current) =>
          current.map((item) => (item.id === updatedController.id ? updatedController : item)),
        );
        this.selectedControllers.set([updatedController]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Confirms and deletes the currently selected controller.
   */
  protected async onDelete(): Promise<void> {
    const selected = this.selectedControllers();
    const route = this.apiRoute();

    if (selected.length !== 1) {
      return;
    }

    const controller = selected[0];

    if (!route || !controller.id) {
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
      title: this.translate.instant('configuration.controllers.delete'),
      data: {
        message: this.translate.instant('configuration.controllers.messages.confirm-delete'),
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

    this.request(this.api.delete<unknown>(`${route}/${controller.id}`)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);
        this.controllers.update((current) => current.filter((item) => item.id !== controller.id));
        this.selectedControllers.set([]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Persists the current visual order in the backend.
   *
   * The current hierarchy context is included so the backend can reorder only
   * the controllers that belong to the active sibling group.
   */
  protected saveOrder(): void {
    const route = this.apiRoute();
    const moduleId = this.moduleId();

    if (!route || !moduleId || this.savingOrder()) {
      return;
    }
    /**
     * The backend needs both the ordered identifiers and the hierarchy context
     * to reorder only the current sibling set.
     */
    const payload = {
      ids: this.controllers().map((item) => item.id),
      module_id: moduleId,
      parent_id: this.activeParentId(),
    };

    this.savingOrder.set(true);

    this.request(this.api.put<ControllersIndexData | ControllerListItem[] | null>(`${route}/save-order`, payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);
        const controllers = Array.isArray(res.data)
          ? res.data
          : res.data?.controllers ?? this.controllers();

        this.controllers.set([...controllers].sort((a, b) => a.order - b.order));
        this.orderingMode.set(false);
        this.selectedControllers.set([]);
      },
      error: () => this.ignoreHandledRequestError(),
      complete: () => {
        this.savingOrder.set(false);
      },
    });
  }

  /**
   * Loads the children of the selected controller inside the same screen.
   *
   * The hierarchical context is preserved in memory through the controller
   * stack, so deeper levels can later navigate to actions and still return to
   * the correct branch of the tree.
   */
  protected onDrillDown(): void {
    const selected = this.selectedControllers();

    if (selected.length !== 1) {
      return;
    }

    const controller = selected[0];
    const currentStack = this.controllerStack.stack();
    const existsInStack = currentStack.some((item) => item.id === controller.id);

    if (existsInStack) {
      this.controllerStack.truncateTo(controller.id);
    } else {
      this.controllerStack.push({
        id: controller.id,
        name: controller.name,
        module_id: controller.module_id,
        parent_id: controller.parent_id,
      });
    }

    this.orderingMode.set(false);
    this.activeParentId.set(controller.id);
    this.loadControllers();
  }

  /**
   * Returns to the previous controller level inside the current module tree.
   *
   * When the stack becomes empty, the screen returns to the root controllers
   * of the selected module.
   */
  protected onBackLevel(): void {
    if (!this.controllerStack.hasItems()) {
      return;
    }

    this.controllerStack.pop();
    const current = this.controllerStack.current();

    this.orderingMode.set(false);
    this.activeParentId.set(current?.id ?? null);
    this.loadControllers();
  }

  /**
   * Navigates to the actions catalog for the selected controller.
   *
   * Important:
   * - The controller stack is NOT modified here.
   * - The stack represents the currently open controllers branch, not the
   *   selected controller targeted for actions.
   *
   * This allows the user to return from actions to the same controller level
   * they were browsing before entering the actions screen.
   */
  protected onActions(): void {
    const selected = this.selectedControllers();

    if (selected.length !== 1) {
      return;
    }

    const controller = selected[0];

    this.router.navigate([controller.id, 'actions'], {
      relativeTo: this.activatedRoute,
    });
  }
}
