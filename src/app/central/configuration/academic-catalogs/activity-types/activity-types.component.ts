import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ColDef } from 'ag-grid-community';

import { BaseCrud } from '@shared/base/base-crud';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { ICellRendererParams } from 'ag-grid-community';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';
import {
  ActivityTypeModalComponent,
  IActivityTypeModalResult,
} from '../activity-type-modal/activity-type-modal.component';

export interface ActivityTypeListItem {
  id: number;
  name: string;
  translation: string | null;
  gradeable: boolean;
  configurable: boolean;
  icon: string | null;
  active: boolean;
  order: number;
}

interface ActivityTypesIndexData {
  'activity-types': ActivityTypeListItem[];
  options?: ScreenOptionItem[];
}

interface ActivityTypeMutationData {
  'activity-types'?: ActivityTypeListItem[];
  'activity-type'?: ActivityTypeListItem;
}

@Component({
  selector: 'app-activity-type-icon-cell-renderer',
  standalone: true,
  imports: [CommonModule, UiIconComponent],
  template: `
    <div class="activity-type-icon-cell" *ngIf="icon; else emptyIcon">
      <app-ui-icon [name]="icon" size="sm" />
      <span class="activity-type-icon-cell__name">{{ icon }}</span>
    </div>

    <ng-template #emptyIcon>
      <span class="activity-type-icon-cell__empty">—</span>
    </ng-template>
  `,
  styles: [
    `
      .activity-type-icon-cell {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        min-width: 0;
      }

      .activity-type-icon-cell__name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .activity-type-icon-cell__empty {
        color: #9ca3af;
      }
    `,
  ],
})
export class ActivityTypeIconCellRenderer {
  protected icon = '';

  agInit(params: ICellRendererParams<ActivityTypeListItem>): void {
    this.icon = params.data?.icon ?? '';
  }

  refresh(params: ICellRendererParams<ActivityTypeListItem>): boolean {
    this.icon = params.data?.icon ?? '';
    return true;
  }
}

@Component({
  selector: 'app-activity-types',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    SkolansTable,
    UiButtonComponent,
  ],
  templateUrl: './activity-types.component.html',
  styleUrl: './activity-types.component.scss',
})
export class ActivityTypesComponent extends BaseCrud<ActivityTypeListItem> implements OnInit {
  protected readonly activityTypes = signal<ActivityTypeListItem[]>([]);
  protected readonly selectedActivityTypes = signal<ActivityTypeListItem[]>([]);

  protected readonly orderingMode = signal(false);
  protected readonly savingOrder = signal(false);
  protected readonly originalActivityTypesOrder = signal<ActivityTypeListItem[]>([]);

  protected readonly hasSelection = computed(() => this.selectedActivityTypes().length > 0);

  protected readonly hasSingleSelection = computed(() => this.selectedActivityTypes().length === 1);

  protected readonly tablePagination = computed(
    () => !this.orderingMode() && this.activityTypes().length > 10,
  );

  protected readonly columnDefs = computed<ColDef<ActivityTypeListItem>[]>(() => {
    const ordering = this.orderingMode();

    const columns: ColDef<ActivityTypeListItem>[] = [
      {
        field: 'name',
        headerValueGetter: () => this.translate.instant('configuration.activity-types.fields.name'),
        flex: 1,
        minWidth: 180,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'translation',
        headerValueGetter: () =>
          this.translate.instant('configuration.activity-types.fields.translation'),
        flex: 1.4,
        minWidth: 260,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
        valueGetter: (params) =>
          params.data?.translation ? this.translate.instant(params.data.translation) : '',
      },
      {
        field: 'icon',
        headerValueGetter: () => this.translate.instant('configuration.activity-types.fields.icon'),
        flex: 1,
        minWidth: 180,
        sortable: !ordering,
        filter: false,
        floatingFilter: false,
        cellRenderer: ActivityTypeIconCellRenderer,
      },
      {
        field: 'gradeable',
        headerValueGetter: () =>
          this.translate.instant('configuration.activity-types.fields.gradeable'),
        width: 130,
        minWidth: 130,
        sortable: !ordering,
        filter: false,
      },
      {
        field: 'configurable',
        headerValueGetter: () =>
          this.translate.instant('configuration.activity-types.fields.configurable'),
        width: 150,
        minWidth: 150,
        sortable: !ordering,
        filter: false,
      },
      {
        field: 'active',
        headerValueGetter: () =>
          this.translate.instant('configuration.activity-types.fields.active'),
        width: 120,
        minWidth: 120,
        sortable: !ordering,
        filter: false,
      },
      {
        field: 'order',
        headerValueGetter: () =>
          this.translate.instant('configuration.activity-types.fields.order'),
        width: 110,
        minWidth: 110,
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

  protected readonly getRowId = (params: { data: ActivityTypeListItem }) => String(params.data.id);

  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadActivityTypes();
  }

  protected reloadActivityTypes(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest<ActivityTypesIndexData>(this.api.get(route), (res) => {
      this.activityTypes.set(res.data['activity-types'] ?? []);
      this.setScreenOptions(res.data.options);
      this.clearSelection(this.selectedActivityTypes);
    });
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedActivityTypes.set(rows as ActivityTypeListItem[]);
  }

  protected startOrdering(): void {
    this.originalActivityTypesOrder.set([...this.activityTypes()]);
    this.clearSelection(this.selectedActivityTypes);
    this.orderingMode.set(true);
  }

  protected cancelOrdering(): void {
    this.activityTypes.set([...this.originalActivityTypesOrder()]);
    this.originalActivityTypesOrder.set([]);
    this.orderingMode.set(false);
    this.savingOrder.set(false);
  }

  protected onRowOrderChange(rows: unknown[]): void {
    this.activityTypes.set(this.normalizeOrder(rows as ActivityTypeListItem[]));
  }

  protected saveOrder(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.savingOrder.set(true);

    this.executeSilentRequest<ActivityTypeMutationData>(
      this.api.put(`${route}/set-order`, {
        ids: this.activityTypes().map((item) => item.id),
      }),
      (res) => {
        this.handleApiSuccess(res);

        this.activityTypes.set(res.data['activity-types'] ?? this.activityTypes());

        this.originalActivityTypesOrder.set([]);
        this.orderingMode.set(false);
        this.savingOrder.set(false);
        this.clearSelection(this.selectedActivityTypes);
      },
      () => {
        this.savingOrder.set(false);
      },
    );
  }

  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<
      {
        title: string;
        collectionKey: string;
        item: ActivityTypeListItem | null;
        order: number;
      },
      IActivityTypeModalResult
    >({
      component: ActivityTypeModalComponent,
      data: {
        title: 'configuration.activity-types.add',
        collectionKey: 'activity-types',
        item: null,
        order: this.activityTypes().length,
      },
      title: this.translate.instant('configuration.activity-types.add'),
      description: this.translate.instant(
        'configuration.activity-types.messages.create-description',
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

    this.executeMutationRequest<ActivityTypeMutationData>(
      this.api.post(route, result.payload),
      (res) => {
        const created = res.data['activity-type'];

        if (!created) {
          this.reloadActivityTypes();
          return;
        }

        this.activityTypes.set(res.data['activity-types'] ?? [...this.activityTypes(), created]);
        this.clearSelection(this.selectedActivityTypes);
      },
    );
  }

  protected async onEdit(): Promise<void> {
    const selected = this.selectedActivityTypes();

    if (selected.length !== 1) {
      return;
    }

    const item = selected[0];
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const result = await this.modal.open<
      {
        title: string;
        collectionKey: string;
        item: ActivityTypeListItem | null;
        order: number;
      },
      IActivityTypeModalResult
    >({
      component: ActivityTypeModalComponent,
      data: {
        title: 'configuration.activity-types.update',
        collectionKey: 'activity-types',
        item,
        order: item.order,
      },
      title: this.translate.instant('configuration.activity-types.update'),
      description: this.translate.instant(
        'configuration.activity-types.messages.update-description',
      ),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved || !result.payload) {
      return;
    }

    this.executeMutationRequest<ActivityTypeMutationData>(
      this.api.put(`${route}/${item.id}`, result.payload),
      (res) => {
        const updated = res.data['activity-type'];

        if (!updated) {
          this.reloadActivityTypes();
          return;
        }

        this.activityTypes.set(
          res.data['activity-types'] ??
            this.activityTypes().map((current) => (current.id === updated.id ? updated : current)),
        );

        this.selectedActivityTypes.set([updated]);
      },
    );
  }

  protected async onDelete(): Promise<void> {
    const selected = this.selectedActivityTypes();

    if (selected.length !== 1) {
      return;
    }

    const item = selected[0];
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.activity-types.delete',
      'configuration.activity-types.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.executeMutationRequest<ActivityTypeMutationData>(
      this.api.delete(`${route}/${item.id}`),
      (res) => {
        this.activityTypes.set(
          res.data?.['activity-types'] ??
            this.activityTypes().filter((current) => current.id !== item.id),
        );

        this.clearSelection(this.selectedActivityTypes);
      },
    );
  }
}
