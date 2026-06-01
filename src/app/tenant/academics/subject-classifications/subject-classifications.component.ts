import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';
import { Router } from '@angular/router';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { ScreenOptionItem, ScreenChildItem } from '@shared/interfaces/configuration.interfaces';

import { SklConfirmModal } from '@shared/base/skl-confirm-modal/skl-confirm-modal';
import {
  ISubjectClassificationModalResult,
  SubjectClassificationModalComponent,
} from '../subject-classification-modal/subject-classification-modal.component';

export interface SubjectClassification {
  id: number;
  name: string;
  translation: string;
  color: string | null;
  active: boolean;
  order: number;
}

interface SubjectClassificationsIndexData {
  'subject-classifications'?: SubjectClassification[];
  options?: ScreenOptionItem[];
  children?: ScreenChildItem[];
}

interface SubjectClassificationMutationData {
  'subject-classification'?: SubjectClassification;
  item?: SubjectClassification;
}

interface ConfirmModalData {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  type: 'danger';
}

@Component({
  selector: 'app-subject-classifications',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './subject-classifications.component.html',
  styleUrl: './subject-classifications.component.scss',
})
export class SubjectClassificationsComponent extends SkolansBaseComponent implements OnInit {
  private readonly router = inject(Router);
  protected readonly items = signal<SubjectClassification[]>([]);
  protected readonly selected = signal<SubjectClassification[]>([]);

  protected readonly orderingMode = signal(false);
  protected readonly savingOrder = signal(false);

  protected readonly hasSelection = computed(() => this.selected().length > 0);
  protected readonly hasSingleSelection = computed(() => this.selected().length === 1);

  protected readonly tablePagination = computed(
    () => !this.orderingMode() && this.items().length > 10,
  );

  protected readonly getRowId = (params: { data: SubjectClassification }) => String(params.data.id);

  protected readonly columnDefs = computed<ColDef<SubjectClassification>[]>(() => {
    const ordering = this.orderingMode();

    const columns: ColDef<SubjectClassification>[] = [
      {
        field: 'name',
        headerValueGetter: () =>
          this.translate.instant('academics.subject-classifications.fields.name'),
        flex: 1,
        sortable: !ordering,
      },
      {
        field: 'translation',
        headerValueGetter: () =>
          this.translate.instant('academics.subject-classifications.fields.translation'),
        flex: 1.5,
        sortable: !ordering,
      },
      {
        field: 'active',
        headerValueGetter: () =>
          this.translate.instant('academics.subject-classifications.fields.active'),
        width: 120,
      },
      {
        field: 'color',
        headerValueGetter: () =>
          this.translate.instant('academics.subject-classifications.fields.color'),
        width: 140,
        sortable: !ordering,
        cellRenderer: (params: ICellRendererParams<SubjectClassification>) => {
          const color = params.data?.color;
          if (!color) return '—';

          return `
            <div style="display:inline-flex;align-items:center;gap:0.5rem;">
              <span style="
                width:14px;
                height:14px;
                border-radius:999px;
                border:1px solid #d1d5db;
                background:${color};
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
    this.selected.set(rows as SubjectClassification[]);
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
    this.items.set(rows as SubjectClassification[]);
  }

  protected saveOrder(): void {
    const route = this.apiRoute();
    if (!route || this.savingOrder()) return;

    const ids = this.items().map((item) => item.id);

    this.savingOrder.set(true);

    this.request(
      this.api.put<SubjectClassificationsIndexData>(`${route}/set-order`, { ids }),
    ).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) return;

        this.handleApiSuccess(res);

        const items = res.data?.['subject-classifications'] ?? this.items();
        this.items.set([...items].sort((a, b) => a.order - b.order));

        this.orderingMode.set(false);
      },
      error: () => this.ignoreHandledRequestError(),
      complete: () => this.savingOrder.set(false),
    });
  }

  protected reload(): void {
    const route = this.apiRoute();
    if (!route) return;

    this.clearScreenOptions();
    this.clearScreenChildren();

    this.request(this.api.get<SubjectClassificationsIndexData>(route)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) return;

        this.items.set(res.data?.['subject-classifications'] ?? []);
        this.setScreenOptions(res.data?.options);
        this.setScreenChildren(res.data?.children);
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
      { item: SubjectClassification | null; order: number },
      ISubjectClassificationModalResult
    >({
      component: SubjectClassificationModalComponent,
      data: {
        item: null,
        order: this.items().length,
      },
      title: this.translate.instant('academics.subject-classifications.add'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) return;

    const route = this.apiRoute();
    if (!route) return;

    this.request(this.api.post<SubjectClassificationMutationData>(route, result.payload)).subscribe(
      {
        next: (res) => {
          if (this.handleApiFailure(res)) return;

          this.handleApiSuccess(res);

          const item = res.data?.['subject-classification'] ?? res.data?.item;

          if (!item) {
            this.reload();
            return;
          }

          this.items.update((current) => [...current, item].sort((a, b) => a.order - b.order));
          this.selected.set([]);
        },
        error: () => this.ignoreHandledRequestError(),
      },
    );
  }

  protected async onEdit(): Promise<void> {
    const item = this.selected()[0];
    const route = this.apiRoute();

    if (!item || !route) return;

    const result = await this.modal.open<
      { item: SubjectClassification | null; order: number },
      ISubjectClassificationModalResult
    >({
      component: SubjectClassificationModalComponent,
      data: {
        item,
        order: item.order,
      },
      title: this.translate.instant('academics.subject-classifications.update'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) return;

    this.request(
      this.api.put<SubjectClassificationMutationData>(`${route}/${item.id}`, result.payload),
    ).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) return;

        this.handleApiSuccess(res);

        const updated = res.data?.['subject-classification'] ?? res.data?.item;

        if (!updated) {
          this.reload();
          return;
        }

        this.items.update((current) =>
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
      title: this.translate.instant('academics.subject-classifications.delete'),
      data: {
        message: this.translate.instant(
          'academics.subject-classifications.messages.confirm-delete',
        ),
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

    this.request(this.api.delete<SubjectClassificationsIndexData>(`${route}/${item.id}`)).subscribe(
      {
        next: (res) => {
          if (this.handleApiFailure(res)) return;

          this.handleApiSuccess(res);

          const items = res.data?.['subject-classifications'];

          if (items) {
            this.items.set([...items].sort((a, b) => a.order - b.order));
          } else {
            this.items.update((current) => current.filter((row) => row.id !== item.id));
          }

          this.selected.set([]);
        },
        error: () => this.ignoreHandledRequestError(),
      },
    );
  }

  protected navigateToChild(): void {
    const selected = this.selected()[0];

    if (!selected) {
      return;
    }

    this.router.navigate(['subject-subcategories', selected.id], {
      relativeTo: this.activatedRoute,
    });
  }
}
