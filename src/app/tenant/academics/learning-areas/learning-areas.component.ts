import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { ScreenOptionItem } from '@shared/interfaces/access.interfaces';

import { SklConfirmModal } from '@shared/base/skl-confirm-modal/skl-confirm-modal';
import {
  ILearningAreaModalResult,
  LearningAreaModalComponent,
} from '../learning-area-modal/learning-area-modal.component';

export interface LearningArea {
  id: number;
  name: string;
  translation: string;
  color: string | null;
  active: boolean;
  order: number;
}

interface LearningAreasIndexData {
  'learning-areas'?: LearningArea[];
  options?: ScreenOptionItem[];
}

interface LearningAreaMutationData {
  'learning-area'?: LearningArea;
  item?: LearningArea;
}

interface ConfirmModalData {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  type: 'danger';
}

@Component({
  selector: 'app-learning-areas',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './learning-areas.component.html',
  styleUrl: './learning-areas.component.scss',
})
export class LearningAreasComponent extends SkolansBaseComponent implements OnInit {
  protected readonly learningAreas = signal<LearningArea[]>([]);
  protected readonly selected = signal<LearningArea[]>([]);

  protected readonly orderingMode = signal(false);
  protected readonly savingOrder = signal(false);

  protected readonly hasSelection = computed(() => this.selected().length > 0);
  protected readonly hasSingleSelection = computed(() => this.selected().length === 1);

  protected readonly tablePagination = computed(
    () => !this.orderingMode() && this.learningAreas().length > 10,
  );

  protected readonly getRowId = (params: { data: LearningArea }) => String(params.data.id);

  protected readonly columnDefs = computed<ColDef<LearningArea>[]>(() => {
    const ordering = this.orderingMode();

    const columns: ColDef<LearningArea>[] = [
      {
        field: 'name',
        headerValueGetter: () => this.translate.instant('academics.learning-areas.fields.name'),
        flex: 1,
        sortable: !ordering,
      },
      {
        field: 'translation',
        headerValueGetter: () =>
          this.translate.instant('academics.learning-areas.fields.translation'),
        flex: 1.5,
        sortable: !ordering,
      },
      {
        field: 'active',
        headerValueGetter: () => this.translate.instant('academics.learning-areas.fields.active'),
        width: 120,
      },
      {
        field: 'color',
        headerValueGetter: () => this.translate.instant('academics.learning-areas.fields.color'),
        width: 140,
        minWidth: 140,
        sortable: !ordering,
        filter: false,
        floatingFilter: false,
        cellRenderer: (params: ICellRendererParams<LearningArea>) => {
          const color = params.data?.color;

          if (!color) {
            return '—';
          }

          return `
          <div style="display:inline-flex;align-items:center;gap:0.5rem;">
            <span style="
              width:14px;
              height:14px;
              border-radius:999px;
              border:1px solid #d1d5db;
              background:${color};
              display:inline-block;
            "></span>
            <span>${color}</span>
          </div>
        `;
        },
      },
    ];

    if (!ordering) return columns;

    return [
      {
        colId: 'drag',
        width: 56,
        rowDrag: true,
        sortable: false,
      },
      ...columns,
    ];
  });

  protected onSelectionChange(rows: unknown[]): void {
    this.selected.set(rows as LearningArea[]);
  }

  protected startOrdering(): void {
    this.orderingMode.set(true);
    this.selected.set([]);
  }

  protected cancelOrdering(): void {
    this.orderingMode.set(false);
    this.reload();
  }

  protected onRowOrderChange(rows: unknown[]): void {
    this.learningAreas.set(rows as LearningArea[]);
  }

  protected saveOrder(): void {
    const route = this.apiRoute();

    if (!route || this.savingOrder()) return;

    const ids = this.learningAreas().map((item) => item.id);

    this.savingOrder.set(true);

    this.request(this.api.put<LearningAreasIndexData>(`${route}/set-order`, { ids })).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) return;

        this.handleApiSuccess(res);

        const items = res.data?.['learning-areas'] ?? this.learningAreas();

        this.learningAreas.set([...items].sort((a, b) => a.order - b.order));

        this.orderingMode.set(false);
      },
      error: () => this.ignoreHandledRequestError(),
      complete: () => this.savingOrder.set(false),
    });
  }

  protected reload(): void {
    const route = this.apiRoute();
    if (!route) return;

    this.request(this.api.get<LearningAreasIndexData>(route)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) return;

        this.learningAreas.set(res.data?.['learning-areas'] ?? []);
        this.setScreenOptions(res.data?.options);
        this.selected.set([]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  ngOnInit(): void {
    this.initRouteMeta();
    this.reload();
  }

  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<
      { item: LearningArea | null; order: number },
      ILearningAreaModalResult
    >({
      component: LearningAreaModalComponent,
      data: {
        item: null,
        order: this.learningAreas().length,
      },
      title: this.translate.instant('academics.learning-areas.add'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) return;

    const route = this.apiRoute();
    if (!route) return;

    this.request(this.api.post<LearningAreaMutationData>(route, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) return;

        this.handleApiSuccess(res);

        const item = res.data?.['learning-area'] ?? res.data?.item;
        if (!item) {
          this.reload();
          return;
        }

        this.learningAreas.update((current) =>
          [...current, item].sort((a, b) => a.order - b.order),
        );
        this.selected.set([]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  protected async onEdit(): Promise<void> {
    const item = this.selected()[0];
    const route = this.apiRoute();

    if (!item || !route) return;

    const result = await this.modal.open<
      { item: LearningArea | null; order: number },
      ILearningAreaModalResult
    >({
      component: LearningAreaModalComponent,
      data: {
        item,
        order: item.order,
      },
      title: this.translate.instant('academics.learning-areas.update'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) return;

    this.request(
      this.api.put<LearningAreaMutationData>(`${route}/${item.id}`, result.payload),
    ).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) return;

        this.handleApiSuccess(res);

        const updated = res.data?.['learning-area'] ?? res.data?.item;
        if (!updated) {
          this.reload();
          return;
        }

        this.learningAreas.update((current) =>
          current
            .map((row) => (row.id === updated.id ? updated : row))
            .sort((a, b) => a.order - b.order),
        );

        this.selected.set([updated]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  protected async onDelete(): Promise<void> {
    const item = this.selected()[0];
    const route = this.apiRoute();

    if (!item || !route) return;

    const confirmed = await this.modal.open<ConfirmModalData, boolean>({
      component: SklConfirmModal,
      title: this.translate.instant('academics.learning-areas.delete'),
      data: {
        message: this.translate.instant('academics.learning-areas.messages.confirm-delete'),
        confirmLabel: this.translate.instant('common.delete'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'danger',
      },
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) return;

    this.request(this.api.delete<LearningAreasIndexData>(`${route}/${item.id}`)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) return;

        this.handleApiSuccess(res);

        const items = res.data?.['learning-areas'];

        if (items) {
          this.learningAreas.set([...items].sort((a, b) => a.order - b.order));
        } else {
          this.learningAreas.update((current) => current.filter((row) => row.id !== item.id));
        }

        this.selected.set([]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }
}
