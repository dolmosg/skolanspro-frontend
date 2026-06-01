import { Component, computed, OnInit, signal, Type } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ColDef, GetRowIdParams } from 'ag-grid-community';

import { SklConfirmModal } from '@shared/base/skl-confirm-modal/skl-confirm-modal';
import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import {
  GradePolicyItemModalComponent,
  GradePolicyItemModalResult,
} from '../grade-policy-item-modal/grade-policy-item-modal.component';

export interface GradePolicy {
  id: number;
  name: string;
  translation: string | null;
  configurable: boolean;
  active: boolean;
  order: number;
}

export interface GradePolicyItem {
  id: number;
  grade_policy_id: number;
  code: string;
  name: string;
  threshold: string | number;
  order: number;
  created_at?: string;
  updated_at?: string;
}

interface GradePolicyItemsIndexData {
  'grade-policy'?: GradePolicy;
  'grade-policy-items'?: GradePolicyItem[];
  'default-grade-policy-items'?: GradePolicyItem[];
  options?: Parameters<SkolansBaseComponent['setScreenOptions']>[0];
}

interface GradePolicyItemsMutationData {
  'grade-policy'?: GradePolicy;
  'grade-policy-items'?: GradePolicyItem[];
  'default-grade-policy-items'?: GradePolicyItem[];
}

@Component({
  selector: 'app-grade-policy-items',
  standalone: true,
  imports: [UiButtonComponent, SkolansTable, TranslatePipe],
  templateUrl: './grade-policy-items.component.html',
  styleUrl: './grade-policy-items.component.scss',
})
export class GradePolicyItemsComponent extends SkolansBaseComponent implements OnInit {
  protected readonly gradePolicyId = signal<number | null>(null);

  protected readonly policy = signal<GradePolicy | null>(null);
  protected readonly items = signal<GradePolicyItem[]>([]);
  protected readonly defaultItems = signal<GradePolicyItem[]>([]);
  protected readonly selectedItems = signal<GradePolicyItem[]>([]);

  protected readonly orderingMode = signal(false);
  protected readonly savingOrder = signal(false);

  protected readonly hasSelection = computed(() => this.selectedItems().length > 0);
  protected readonly hasSingleSelection = computed(() => this.selectedItems().length === 1);

  protected readonly tablePagination = computed(
    () => !this.orderingMode() && this.items().length > 10,
  );

  protected readonly columnDefs = computed<ColDef<GradePolicyItem>[]>(() => {
    const ordering = this.orderingMode();

    const columns: ColDef<GradePolicyItem>[] = [
      {
        field: 'code',
        headerValueGetter: () =>
          this.translate.instant('configuration.grade-policy-items.fields.code'),
        width: 120,
        minWidth: 120,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'name',
        headerValueGetter: () =>
          this.translate.instant('configuration.grade-policy-items.fields.name'),
        flex: 1,
        minWidth: 220,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'threshold',
        headerValueGetter: () =>
          this.translate.instant('configuration.grade-policy-items.fields.threshold'),
        width: 150,
        minWidth: 150,
        sortable: !ordering,
        filter: ordering ? false : 'agNumberColumnFilter',
        floatingFilter: !ordering,
        valueFormatter: (params) => Number(params.value ?? 0).toFixed(2),
      },
      {
        field: 'order',
        headerValueGetter: () =>
          this.translate.instant('configuration.grade-policy-items.fields.order'),
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

  protected readonly getRowId = (params: GetRowIdParams<GradePolicyItem>): string => {
    return String(params.data.id);
  };

  ngOnInit(): void {
    this.initRouteMeta();

    const id = Number(this.activatedRoute.snapshot.paramMap.get('gradePolicyId'));

    if (!Number.isFinite(id) || id <= 0) {
      return;
    }

    this.gradePolicyId.set(id);
    this.load();
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedItems.set(rows as GradePolicyItem[]);
  }

  protected load(): void {
    const route = this.apiRoute();
    const id = this.gradePolicyId();

    if (!route || !id) {
      return;
    }

    this.executeSilentRequest<GradePolicyItemsIndexData>(
      this.api.get<GradePolicyItemsIndexData>(`${route}/${id}`),
      (res) => {
        this.applyResponseData(res.data);
        this.setScreenOptions(res.data?.options);
      },
      () => {
        this.policy.set(null);
        this.items.set([]);
        this.defaultItems.set([]);
        this.selectedItems.set([]);
        this.setScreenOptions([]);
      },
    );
  }

  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<any, GradePolicyItemModalResult>({
      component: GradePolicyItemModalComponent,
      data: {
        item: null,
        order: this.items().length,
      },
      title: this.translate.instant('configuration.grade-policy-items.add'),
      size: 'md',
      closeOnBackdrop: false,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved || !result.payload) {
      return;
    }

    const items = this.normalizeItems([
      ...this.items(),
      {
        id: 0,
        grade_policy_id: this.gradePolicyId() ?? 0,
        ...result.payload,
      },
    ]);

    this.saveItems(items);
  }

  protected async onEdit(): Promise<void> {
    const selected = this.selectedItems()[0];

    if (!selected) {
      return;
    }

    const result = await this.modal.open<any, GradePolicyItemModalResult>({
      component: GradePolicyItemModalComponent,
      data: {
        item: selected,
        order: selected.order,
      },
      title: this.translate.instant('configuration.grade-policy-items.update'),
      size: 'md',
      closeOnBackdrop: false,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved || !result.payload) {
      return;
    }

    const items = this.normalizeItems(
      this.items().map((item) =>
        item.id === selected.id
          ? {
              ...item,
              ...result.payload,
            }
          : item,
      ),
    );

    this.saveItems(items);
  }

  private saveItems(items: GradePolicyItem[]): void {
    const route = this.apiRoute();
    const id = this.gradePolicyId();

    if (!route || !id) {
      return;
    }

    this.executeMutationRequest<GradePolicyItemsMutationData>(
      this.api.put<GradePolicyItemsMutationData>(`${route}/${id}`, {
        items: items.map((item, index) => ({
          id: item.id > 0 ? item.id : null,
          code: item.code,
          name: item.name,
          threshold: Number(item.threshold),
          order: index,
        })),
      }),
      (res) => {
        this.applyResponseData(res.data);
      },
    );
  }

  protected async onDelete(): Promise<void> {
    const selected = this.selectedItems()[0];

    if (!selected) {
      return;
    }

    const confirmed = await this.modal.open<any, boolean>({
      component: SklConfirmModal as Type<unknown>,
      data: {
        message: this.translate.instant('configuration.grade-policy-items.messages.confirm-delete'),
        confirmLabel: this.translate.instant('common.delete'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'danger',
      },
      title: this.translate.instant('configuration.grade-policy-items.delete'),
      size: 'sm',
      closeOnBackdrop: false,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) {
      return;
    }

    const items = this.normalizeItems(this.items().filter((item) => item.id !== selected.id));

    this.saveItems(items);
  }

  protected startOrdering(): void {
    this.orderingMode.set(true);
    this.selectedItems.set([]);
  }

  protected cancelOrdering(): void {
    this.orderingMode.set(false);
    this.selectedItems.set([]);
    this.load();
  }

  protected onRowOrderChange(event: unknown): void {
    if (!Array.isArray(event)) {
      return;
    }

    this.items.set(
      (event as GradePolicyItem[]).map((item, index) => ({
        ...item,
        order: index,
      })),
    );
  }

  protected saveOrder(): void {
    const route = this.apiRoute();
    const id = this.gradePolicyId();

    if (!route || !id || this.savingOrder()) {
      return;
    }

    this.savingOrder.set(true);

    this.executeSilentRequest<GradePolicyItemsMutationData>(
      this.api.put<GradePolicyItemsMutationData>(`${route}/set-order/${id}`, {
        ids: this.items().map((item) => item.id),
      }),
      (res) => {
        this.handleApiSuccess(res);
        this.applyResponseData(res.data);
        this.orderingMode.set(false);
        this.savingOrder.set(false);
      },
      () => {
        this.savingOrder.set(false);
      },
    );
  }

  protected async onRestore(): Promise<void> {
    const route = this.apiRoute();
    const id = this.gradePolicyId();

    if (!route || !id) {
      return;
    }

    const confirmed = await this.modal.open<any, boolean>({
      component: SklConfirmModal as Type<unknown>,
      data: {
        message: this.translate.instant(
          'configuration.grade-policy-items.messages.confirm-restore',
        ),
        confirmLabel: this.translate.instant('configuration.grade-policy-items.restore'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'warning',
      },
      title: this.translate.instant('configuration.grade-policy-items.restore'),
      size: 'sm',
      closeOnBackdrop: false,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) {
      return;
    }

    this.executeMutationRequest<GradePolicyItemsMutationData>(
      this.api.put<GradePolicyItemsMutationData>(`${route}/reset/${id}`, {}),
      (res) => {
        this.applyResponseData(res.data);
        this.selectedItems.set([]);
      },
    );
  }

  private applyResponseData(data?: GradePolicyItemsMutationData): void {
    this.policy.set(data?.['grade-policy'] ?? this.policy());
    this.items.set(this.normalizeItems(data?.['grade-policy-items'] ?? this.items()));
    this.defaultItems.set(
      this.normalizeItems(data?.['default-grade-policy-items'] ?? this.defaultItems()),
    );
    this.selectedItems.set([]);
  }

  private normalizeItems(items: GradePolicyItem[] = []): GradePolicyItem[] {
    return [...items]
      .map((item) => ({
        ...item,
        threshold: Number(item.threshold),
      }))
      .sort((a, b) => a.order - b.order);
  }
}
