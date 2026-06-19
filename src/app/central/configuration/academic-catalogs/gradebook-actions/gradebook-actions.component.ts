import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ColDef, GetRowIdParams } from 'ag-grid-community';

import { BaseCrud } from '@shared/base/base-crud';
import { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import {
  GradebookActionModalComponent,
  GradebookActionModalData,
  GradebookActionModalResult,
} from '../gradebook-action-modal/gradebook-action-modal.component';

export interface IGradebookAction {
  id: number;
  name: string;
  translation: string | null;
  icon: string | null;
  color: string | null;
  active: boolean;
  order: number;
}

interface GradebookActionsIndexData {
  'gradebook-actions': IGradebookAction[];
  'gradebook-action'?: IGradebookAction;
  options?: ScreenOptionItem[];
}

@Component({
  selector: 'app-gradebook-action-icon-renderer',
  standalone: true,
  imports: [CommonModule, UiIconComponent],
  template: `
    <div class="gradebook-action-icon-cell">
      @if (icon) {
        <app-ui-icon [name]="icon" size="sm" tone="muted" />
      }

      <span>{{ icon || '' }}</span>
    </div>
  `,
})
export class GradebookActionIconRenderer implements ICellRendererAngularComp {
  protected icon: string | null = null;

  agInit(params: { data?: IGradebookAction }): void {
    this.icon = params.data?.icon ?? null;
  }

  refresh(params: { data?: IGradebookAction }): boolean {
    this.icon = params.data?.icon ?? null;
    return true;
  }
}

@Component({
  selector: 'app-gradebook-actions',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './gradebook-actions.component.html',
  styleUrl: './gradebook-actions.component.scss',
})
export class GradebookActionsComponent extends BaseCrud<IGradebookAction> implements OnInit {
  protected readonly gradebookActions = signal<IGradebookAction[]>([]);
  protected readonly selectedGradebookActions = signal<IGradebookAction[]>([]);

  protected readonly orderingMode = signal(false);
  protected readonly savingOrder = signal(false);
  protected readonly originalOrder = signal<IGradebookAction[]>([]);

  protected readonly hasSelection = computed(() => this.selectedGradebookActions().length > 0);
  protected readonly hasSingleSelection = computed(
    () => this.selectedGradebookActions().length === 1,
  );

  protected readonly tablePagination = computed(() => {
    return !this.orderingMode() && this.gradebookActions().length > 10;
  });

  protected readonly columnDefs = computed<ColDef<IGradebookAction>[]>(() => {
    const ordering = this.orderingMode();

    const columns: ColDef<IGradebookAction>[] = [
      {
        field: 'name',
        headerValueGetter: () =>
          this.translate.instant('configuration.gradebook-actions.fields.name'),
        flex: 1,
        minWidth: 160,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'translation',
        headerValueGetter: () =>
          this.translate.instant('configuration.gradebook-actions.fields.translation'),
        flex: 1.5,
        minWidth: 220,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
        valueGetter: ({ data }) => this.translateValue(data?.translation),
      },
      {
        field: 'icon',
        headerValueGetter: () =>
          this.translate.instant('configuration.gradebook-actions.fields.icon'),
        width: 180,
        sortable: !ordering,
        filter: false,
        cellRenderer: GradebookActionIconRenderer,
      },
      {
        field: 'color',
        headerValueGetter: () =>
          this.translate.instant('configuration.gradebook-actions.fields.color'),
        width: 120,
        sortable: !ordering,
        filter: false,
      },
      {
        field: 'active',
        headerValueGetter: () => this.translate.instant('common.active'),
        width: 110,
        sortable: !ordering,
        filter: false,
      },
      {
        field: 'order',
        headerValueGetter: () => this.translate.instant('common.order'),
        width: 100,
        sortable: !ordering,
        filter: false,
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

  protected readonly getRowId = (params: GetRowIdParams<IGradebookAction>): string => {
    return String(params.data.id);
  };

  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadGradebookActions();
  }

  protected reloadGradebookActions(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest<GradebookActionsIndexData>(this.api.get(route), (res) => {
      this.gradebookActions.set(res.data['gradebook-actions'] ?? []);
      this.setScreenOptions(res.data.options);
      this.clearSelection(this.selectedGradebookActions);
    });
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedGradebookActions.set(rows as IGradebookAction[]);
  }

  protected startOrdering(): void {
    this.originalOrder.set([...this.gradebookActions()]);
    this.clearSelection(this.selectedGradebookActions);
    this.orderingMode.set(true);
  }

  protected cancelOrdering(): void {
    this.gradebookActions.set([...this.originalOrder()]);
    this.originalOrder.set([]);
    this.orderingMode.set(false);
    this.savingOrder.set(false);
  }

  protected onRowOrderChange(rows: unknown[]): void {
    this.gradebookActions.set(this.normalizeOrder(rows as IGradebookAction[]));
  }

  protected saveOrder(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.savingOrder.set(true);

    this.executeSilentRequest<GradebookActionsIndexData>(
      this.api.put(`${route}/set-order`, {
        ids: this.gradebookActions().map((item) => item.id),
      }),
      (res) => {
        this.handleApiSuccess(res);
        this.gradebookActions.set(res.data['gradebook-actions'] ?? this.gradebookActions());
        this.originalOrder.set([]);
        this.orderingMode.set(false);
        this.savingOrder.set(false);
        this.clearSelection(this.selectedGradebookActions);
      },
      () => {
        this.savingOrder.set(false);
      },
    );
  }

  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<GradebookActionModalData, GradebookActionModalResult>({
      component: GradebookActionModalComponent,
      data: {
        item: null,
      },
      title: this.translate.instant('configuration.gradebook-actions.add'),
      description: this.translate.instant(
        'configuration.gradebook-actions.messages.create-description',
      ),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved || !result.payload) {
      return;
    }

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const payload = {
      ...result.payload,
      order: this.gradebookActions().length,
    };

    this.executeMutationRequest<GradebookActionsIndexData>(this.api.post(route, payload), (res) => {
      this.gradebookActions.set(res.data['gradebook-actions'] ?? this.gradebookActions());
      this.clearSelection(this.selectedGradebookActions);
    });
  }

  protected async onEdit(): Promise<void> {
    const item = this.selectedGradebookActions()[0];

    if (!item) {
      return;
    }

    const result = await this.modal.open<GradebookActionModalData, GradebookActionModalResult>({
      component: GradebookActionModalComponent,
      data: {
        item,
      },
      title: this.translate.instant('configuration.gradebook-actions.update'),
      description: this.translate.instant(
        'configuration.gradebook-actions.messages.update-description',
      ),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved || !result.payload) {
      return;
    }

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeMutationRequest<GradebookActionsIndexData>(
      this.api.put(`${route}/${item.id}`, result.payload),
      (res) => {
        const updated = res.data['gradebook-action'];

        this.gradebookActions.set(res.data['gradebook-actions'] ?? this.gradebookActions());

        if (updated) {
          this.selectedGradebookActions.set([updated]);
        }
      },
    );
  }

  protected async onDelete(): Promise<void> {
    const item = this.selectedGradebookActions()[0];

    if (!item) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.gradebook-actions.delete',
      'configuration.gradebook-actions.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeMutationRequest<GradebookActionsIndexData>(
      this.api.delete(`${route}/${item.id}`),
      (res) => {
        this.gradebookActions.set(res.data['gradebook-actions'] ?? this.gradebookActions());
        this.clearSelection(this.selectedGradebookActions);
      },
    );
  }

  private translateValue(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    return value.includes('.') ? this.translate.instant(value) : value;
  }
}
