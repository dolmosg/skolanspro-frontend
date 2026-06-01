import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ColDef, GetRowIdParams } from 'ag-grid-community';

import { BaseCrud } from '@shared/base/base-crud';
import { ScreenOptionItem } from '@shared/interfaces/configuration.interfaces';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import {
  GradingScaleModalComponent,
  GradingScaleModalData,
  GradingScaleModalResult,
} from '../grading-scale-modal/grading-scale-modal.component';

export interface IGradingScale {
  id: number;
  name: string;
  translation: string | null;
  minimum: number;
  maximum: number;
  active: boolean;
  order: number;
}

interface GradingScalesIndexData {
  'grading-scales': IGradingScale[];
  'grading-scale'?: IGradingScale;
  options?: ScreenOptionItem[];
}

@Component({
  selector: 'app-grading-scales',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './grading-scales.component.html',
  styleUrl: './grading-scales.component.scss',
})
export class GradingScalesComponent extends BaseCrud<IGradingScale> implements OnInit {
  protected readonly gradingScales = signal<IGradingScale[]>([]);
  protected readonly selectedGradingScales = signal<IGradingScale[]>([]);

  protected readonly orderingMode = signal(false);
  protected readonly savingOrder = signal(false);
  protected readonly originalOrder = signal<IGradingScale[]>([]);

  protected readonly hasSelection = computed(() => this.selectedGradingScales().length > 0);
  protected readonly hasSingleSelection = computed(() => this.selectedGradingScales().length === 1);

  protected readonly tablePagination = computed(() => {
    return !this.orderingMode() && this.gradingScales().length > 10;
  });

  protected readonly columnDefs = computed<ColDef<IGradingScale>[]>(() => {
    const ordering = this.orderingMode();

    const columns: ColDef<IGradingScale>[] = [
      {
        field: 'name',
        headerValueGetter: () =>
          this.translate.instant('configuration.grading-scales.fields.name'),
        flex: 1,
        minWidth: 160,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'translation',
        headerValueGetter: () =>
          this.translate.instant('configuration.grading-scales.fields.translation'),
        flex: 1.5,
        minWidth: 220,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
        valueGetter: ({ data }) => this.translateValue(data?.translation),
      },
      {
        field: 'minimum',
        headerValueGetter: () =>
          this.translate.instant('configuration.grading-scales.fields.minimum'),
        width: 130,
        sortable: !ordering,
        filter: false,
      },
      {
        field: 'maximum',
        headerValueGetter: () =>
          this.translate.instant('configuration.grading-scales.fields.maximum'),
        width: 130,
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

  protected readonly getRowId = (params: GetRowIdParams<IGradingScale>): string => {
    return String(params.data.id);
  };

  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadGradingScales();
  }

  protected reloadGradingScales(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest<GradingScalesIndexData>(this.api.get(route), (res) => {
      this.gradingScales.set(res.data['grading-scales'] ?? []);
      this.setScreenOptions(res.data.options);
      this.clearSelection(this.selectedGradingScales);
    });
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedGradingScales.set(rows as IGradingScale[]);
  }

  protected startOrdering(): void {
    this.originalOrder.set([...this.gradingScales()]);
    this.clearSelection(this.selectedGradingScales);
    this.orderingMode.set(true);
  }

  protected cancelOrdering(): void {
    this.gradingScales.set([...this.originalOrder()]);
    this.originalOrder.set([]);
    this.orderingMode.set(false);
    this.savingOrder.set(false);
  }

  protected onRowOrderChange(rows: unknown[]): void {
    this.gradingScales.set(this.normalizeOrder(rows as IGradingScale[]));
  }

  protected saveOrder(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.savingOrder.set(true);

    this.executeSilentRequest<GradingScalesIndexData>(
      this.api.put(`${route}/set-order`, {
        ids: this.gradingScales().map((item) => item.id),
      }),
      (res) => {
        this.handleApiSuccess(res);
        this.gradingScales.set(res.data['grading-scales'] ?? this.gradingScales());
        this.originalOrder.set([]);
        this.orderingMode.set(false);
        this.savingOrder.set(false);
        this.clearSelection(this.selectedGradingScales);
      },
      () => {
        this.savingOrder.set(false);
      },
    );
  }

  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<GradingScaleModalData, GradingScaleModalResult>({
      component: GradingScaleModalComponent,
      data: {
        item: null,
      },
      title: this.translate.instant('configuration.grading-scales.add'),
      description: this.translate.instant(
        'configuration.grading-scales.messages.create-description',
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
      order: this.gradingScales().length,
    };

    this.executeMutationRequest<GradingScalesIndexData>(this.api.post(route, payload), (res) => {
      this.gradingScales.set(res.data['grading-scales'] ?? this.gradingScales());
      this.clearSelection(this.selectedGradingScales);
    });
  }

  protected async onEdit(): Promise<void> {
    const item = this.selectedGradingScales()[0];

    if (!item) {
      return;
    }

    const result = await this.modal.open<GradingScaleModalData, GradingScaleModalResult>({
      component: GradingScaleModalComponent,
      data: {
        item,
      },
      title: this.translate.instant('configuration.grading-scales.update'),
      description: this.translate.instant(
        'configuration.grading-scales.messages.update-description',
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

    this.executeMutationRequest<GradingScalesIndexData>(
      this.api.put(`${route}/${item.id}`, result.payload),
      (res) => {
        const updated = res.data['grading-scale'];

        this.gradingScales.set(res.data['grading-scales'] ?? this.gradingScales());

        if (updated) {
          this.selectedGradingScales.set([updated]);
        }
      },
    );
  }

  protected async onDelete(): Promise<void> {
    const item = this.selectedGradingScales()[0];

    if (!item) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.grading-scales.delete',
      'configuration.grading-scales.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeMutationRequest<GradingScalesIndexData>(
      this.api.delete(`${route}/${item.id}`),
      (res) => {
        this.gradingScales.set(res.data['grading-scales'] ?? this.gradingScales());
        this.clearSelection(this.selectedGradingScales);
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