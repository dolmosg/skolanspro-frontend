import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ColDef, GetRowIdParams } from 'ag-grid-community';

import { BaseCrud } from '@shared/base/base-crud';
import { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import {
  AspectModeModalComponent,
  AspectModeModalData,
  AspectModeModalResult,
} from '../aspect-mode-modal/aspect-mode-modal.component';

export interface IAspectMode {
  id: number;
  name: string;
  translation: string | null;
  active: boolean;
  order: number;
}

interface AspectModesIndexData {
  'aspect-modes': IAspectMode[];
  'aspect-mode'?: IAspectMode;
  options?: ScreenOptionItem[];
}

@Component({
  selector: 'app-aspect-modes',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './aspect-modes.component.html',
  styleUrl: './aspect-modes.component.scss',
})
export class AspectModesComponent extends BaseCrud<IAspectMode> implements OnInit {
  protected readonly aspectModes = signal<IAspectMode[]>([]);
  protected readonly selectedAspectModes = signal<IAspectMode[]>([]);

  protected readonly orderingMode = signal(false);
  protected readonly savingOrder = signal(false);
  protected readonly originalOrder = signal<IAspectMode[]>([]);

  protected readonly hasSelection = computed(() => this.selectedAspectModes().length > 0);
  protected readonly hasSingleSelection = computed(() => this.selectedAspectModes().length === 1);

  protected readonly tablePagination = computed(() => {
    return !this.orderingMode() && this.aspectModes().length > 10;
  });

  protected readonly columnDefs = computed<ColDef<IAspectMode>[]>(() => {
    const ordering = this.orderingMode();

    const columns: ColDef<IAspectMode>[] = [
      {
        field: 'name',
        headerValueGetter: () => this.translate.instant('configuration.aspect-modes.fields.name'),
        flex: 1,
        minWidth: 160,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'translation',
        headerValueGetter: () =>
          this.translate.instant('configuration.aspect-modes.fields.translation'),
        flex: 1.5,
        minWidth: 220,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
        valueGetter: ({ data }) => this.translateValue(data?.translation),
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

  protected readonly getRowId = (params: GetRowIdParams<IAspectMode>): string => {
    return String(params.data.id);
  };

  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadAspectModes();
  }

  protected reloadAspectModes(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest<AspectModesIndexData>(this.api.get(route), (res) => {
      this.aspectModes.set(res.data['aspect-modes'] ?? []);
      this.setScreenOptions(res.data.options);
      this.clearSelection(this.selectedAspectModes);
    });
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedAspectModes.set(rows as IAspectMode[]);
  }

  protected startOrdering(): void {
    this.originalOrder.set([...this.aspectModes()]);
    this.clearSelection(this.selectedAspectModes);
    this.orderingMode.set(true);
  }

  protected cancelOrdering(): void {
    this.aspectModes.set([...this.originalOrder()]);
    this.originalOrder.set([]);
    this.orderingMode.set(false);
    this.savingOrder.set(false);
  }

  protected onRowOrderChange(rows: unknown[]): void {
    this.aspectModes.set(this.normalizeOrder(rows as IAspectMode[]));
  }

  protected saveOrder(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.savingOrder.set(true);

    this.executeSilentRequest<AspectModesIndexData>(
      this.api.put(`${route}/set-order`, {
        ids: this.aspectModes().map((item) => item.id),
      }),
      (res) => {
        this.handleApiSuccess(res);
        this.aspectModes.set(res.data['aspect-modes'] ?? this.aspectModes());
        this.originalOrder.set([]);
        this.orderingMode.set(false);
        this.savingOrder.set(false);
        this.clearSelection(this.selectedAspectModes);
      },
      () => {
        this.savingOrder.set(false);
      },
    );
  }

  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<AspectModeModalData, AspectModeModalResult>({
      component: AspectModeModalComponent,
      data: { item: null },
      title: this.translate.instant('configuration.aspect-modes.add'),
      description: this.translate.instant('configuration.aspect-modes.messages.create-description'),
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
      order: this.aspectModes().length,
    };

    this.executeMutationRequest<AspectModesIndexData>(this.api.post(route, payload), (res) => {
      this.aspectModes.set(res.data['aspect-modes'] ?? this.aspectModes());
      this.clearSelection(this.selectedAspectModes);
    });
  }

  protected async onEdit(): Promise<void> {
    const item = this.selectedAspectModes()[0];

    if (!item) {
      return;
    }

    const result = await this.modal.open<AspectModeModalData, AspectModeModalResult>({
      component: AspectModeModalComponent,
      data: { item },
      title: this.translate.instant('configuration.aspect-modes.update'),
      description: this.translate.instant('configuration.aspect-modes.messages.update-description'),
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

    this.executeMutationRequest<AspectModesIndexData>(
      this.api.put(`${route}/${item.id}`, result.payload),
      (res) => {
        const updated = res.data['aspect-mode'];

        this.aspectModes.set(res.data['aspect-modes'] ?? this.aspectModes());

        if (updated) {
          this.selectedAspectModes.set([updated]);
        }
      },
    );
  }

  protected async onDelete(): Promise<void> {
    const item = this.selectedAspectModes()[0];

    if (!item) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.aspect-modes.delete',
      'configuration.aspect-modes.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeMutationRequest<AspectModesIndexData>(
      this.api.delete(`${route}/${item.id}`),
      (res) => {
        this.aspectModes.set(res.data['aspect-modes'] ?? this.aspectModes());
        this.clearSelection(this.selectedAspectModes);
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