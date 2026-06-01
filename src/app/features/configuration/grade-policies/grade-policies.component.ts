import { Component, computed, OnInit, signal, Type } from '@angular/core';
import { TranslateModule, TranslatePipe } from '@ngx-translate/core';
import { ColDef, GetRowIdParams } from 'ag-grid-community';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { SklConfirmModal } from '@shared/base/skl-confirm-modal/skl-confirm-modal';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import {
  GradePoliciesModalComponent,
  IGradePolicyModalData,
  IGradePolicyModalResult,
} from '../grade-policies-modal/grade-policies-modal.component';
import { Router } from '@angular/router';

interface GradePoliciesIndexData {
  'grade-policies'?: GradePolicy[];
  options?: Parameters<SkolansBaseComponent['setScreenOptions']>[0];
}

interface GradePolicyMutationData {
  'grade-policy'?: GradePolicy;
  'grade-policies'?: GradePolicy[];
}

interface GradePoliciesOrderData {
  'grade-policies'?: GradePolicy[];
}

export interface GradePolicy {
  id: number;
  name: string;
  translation: string | null;
  configurable: boolean;
  active: boolean;
  order: number;
}

@Component({
  selector: 'app-grade-policies',
  standalone: true,
  imports: [TranslateModule, TranslatePipe, UiButtonComponent, SkolansTable],
  templateUrl: './grade-policies.component.html',
  styleUrl: './grade-policies.component.scss',
})
export class GradePoliciesComponent extends SkolansBaseComponent implements OnInit {
  protected readonly policies = signal<GradePolicy[]>([]);
  protected readonly selectedItems = signal<GradePolicy[]>([]);

  protected readonly orderingMode = signal(false);
  protected readonly savingOrder = signal(false);

  protected readonly hasSelection = computed(() => this.selectedItems().length > 0);
  protected readonly hasSingleSelection = computed(() => this.selectedItems().length === 1);

  protected readonly tablePagination = computed(
    () => !this.orderingMode() && this.policies().length > 10,
  );

  constructor(private router: Router) {
    super();
  }

  protected readonly columnDefs = computed<ColDef<GradePolicy>[]>(() => {
    const ordering = this.orderingMode();

    const columns: ColDef<GradePolicy>[] = [
      {
        field: 'name',
        headerValueGetter: () => this.translate.instant('configuration.grade-policies.fields.name'),
        flex: 1,
        minWidth: 180,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'translation',
        headerValueGetter: () =>
          this.translate.instant('configuration.grade-policies.fields.translation'),
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
        field: 'configurable',
        headerValueGetter: () =>
          this.translate.instant('configuration.grade-policies.fields.configurable'),
        width: 150,
        minWidth: 150,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
        valueGetter: (params) =>
          params.data?.configurable
            ? this.translate.instant('common.yes')
            : this.translate.instant('common.no'),
      },
      {
        field: 'active',
        headerValueGetter: () =>
          this.translate.instant('configuration.grade-policies.fields.active'),
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
          this.translate.instant('configuration.grade-policies.fields.order'),
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

  protected readonly getRowId = (params: GetRowIdParams<GradePolicy>): string => {
    return String(params.data.id);
  };

  ngOnInit(): void {
    this.initRouteMeta();
    this.loadPolicies();
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedItems.set(rows as GradePolicy[]);
  }

  protected loadPolicies(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.clearScreenOptions();

    this.executeSilentRequest<GradePoliciesIndexData | GradePolicy[]>(
      this.api.get(route),
      (response) => {
        const policies = this.extractPolicies(response.data);

        this.setScreenOptions(Array.isArray(response.data) ? undefined : response.data?.options);
        this.policies.set(policies);
        this.selectedItems.set([]);
      },
      () => {
        this.policies.set([]);
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

    const result = await this.modal.open<IGradePolicyModalData, IGradePolicyModalResult>({
      component: GradePoliciesModalComponent,
      data: {
        title: 'controllers.grade-policies',
        collectionKey: 'grade-policies',
        item: null,
        order: this.policies().length,
      },
      title: this.translate.instant('configuration.grade-policies.add'),
      description: this.translate.instant(
        'configuration.grade-policies.messages.create-description',
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
      this.api.post<GradePolicyMutationData>(route, result.payload),
      (response) => {
        const created = this.extractPolicy(response.data);

        if (!created) {
          this.loadPolicies();
          return;
        }

        this.policies.set(this.extractPolicies(response.data, [...this.policies(), created]));
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

    const result = await this.modal.open<IGradePolicyModalData, IGradePolicyModalResult>({
      component: GradePoliciesModalComponent,
      data: {
        title: 'controllers.grade-policies',
        collectionKey: 'grade-policies',
        item: selected,
        order: selected.order,
      },
      title: this.translate.instant('configuration.grade-policies.update'),
      description: this.translate.instant(
        'configuration.grade-policies.messages.update-description',
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
      this.api.put<GradePolicyMutationData>(`${route}/${selected.id}`, {
        ...result.payload,
        order: selected.order,
      }),
      (response) => {
        const updated = this.extractPolicy(response.data);

        if (!updated) {
          this.loadPolicies();
          return;
        }

        const fallback = this.policies().map((item) => (item.id === updated.id ? updated : item));

        this.policies.set(this.extractPolicies(response.data, fallback));
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
        message: this.translate.instant('configuration.grade-policies.messages.confirm-delete'),
        confirmLabel: this.translate.instant('common.delete'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'danger',
      },
      title: this.translate.instant('configuration.grade-policies.delete'),
      size: 'sm',
      closeOnBackdrop: false,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) {
      return;
    }

    this.executeMutationRequest(
      this.api.delete<GradePoliciesIndexData>(`${route}/${selected.id}`),
      (response) => {
        const fallback = this.policies().filter((item) => item.id !== selected.id);

        this.policies.set(this.extractPolicies(response.data, fallback));
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
    this.loadPolicies();
  }

  protected onRowOrderChange(event: unknown): void {
    if (!Array.isArray(event)) {
      return;
    }

    this.policies.set(
      (event as GradePolicy[]).map((item, index) => ({
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

    const ids = this.policies().map((item) => item.id);

    this.savingOrder.set(true);

    this.executeSilentRequest<GradePoliciesOrderData | GradePolicy[]>(
      this.api.put(`${route}/set-order`, { ids }),
      (response) => {
        this.handleApiSuccess(response);

        this.policies.set(this.extractPolicies(response.data, this.policies()));
        this.orderingMode.set(false);
        this.selectedItems.set([]);
        this.savingOrder.set(false);
      },
      () => {
        this.savingOrder.set(false);
      },
    );
  }

  private extractPolicy(data: GradePolicyMutationData | undefined): GradePolicy | null {
    const candidate = data?.['grade-policy'];

    if (!candidate || !this.isGradePolicy(candidate)) {
      return null;
    }

    return candidate;
  }

  private extractPolicies(
    data: GradePoliciesIndexData | GradePoliciesOrderData | GradePolicy[] | undefined,
    fallback: GradePolicy[] = [],
  ): GradePolicy[] {
    if (Array.isArray(data)) {
      return this.sortPolicies(data);
    }

    const policies = data?.['grade-policies'];

    if (!Array.isArray(policies)) {
      return this.sortPolicies(fallback);
    }

    return this.sortPolicies(policies);
  }

  protected onConfigure(): void {
    const selected = this.selectedItems()[0];

    if (!selected?.configurable) {
      return;
    }

    this.router.navigate(['grade-policy-items', selected.id], {
      relativeTo: this.activatedRoute,
    });
  }

  private sortPolicies(items: GradePolicy[]): GradePolicy[] {
    return [...items].sort((a, b) => a.order - b.order);
  }

  private isGradePolicy(value: unknown): value is GradePolicy {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const item = value as Partial<GradePolicy>;

    return (
      typeof item.id === 'number' &&
      typeof item.name === 'string' &&
      (typeof item.translation === 'string' || item.translation === null) &&
      typeof item.configurable === 'boolean' &&
      typeof item.active === 'boolean' &&
      typeof item.order === 'number'
    );
  }
}
