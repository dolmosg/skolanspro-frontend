import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { ScreenOptionItem } from '@shared/interfaces/configuration.interfaces';

import { SklConfirmModal } from '@shared/base/skl-confirm-modal/skl-confirm-modal';
import {
  ISubjectSubCategoryModalResult,
  SubjectSubCategoryModalComponent,
} from '../subject-sub-category-modal/subject-sub-category-modal.component';

interface SubjectSubcategoryMutationData {
  'subject-subcategory'?: SubjectSubcategory;
  item?: SubjectSubcategory;
}

interface ConfirmModalData {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  type: 'danger';
}

export interface SubjectSubcategory {
  id: number;
  subject_classification_id: number;
  name: string;
  translation: string;
  active: boolean;
  order: number;
}

export interface SubjectClassificationContext {
  id: number;
  name: string;
  translation: string;
  color: string | null;
  active: boolean;
  order: number;
}

interface SubjectSubcategoriesIndexData {
  'subject-classification'?: SubjectClassificationContext;
  'subject-subcategories'?: SubjectSubcategory[];
  options?: ScreenOptionItem[];
}

@Component({
  selector: 'app-subject-sub-categories',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './subject-sub-categories.component.html',
  styleUrl: './subject-sub-categories.component.scss',
})
export class SubjectSubCategoriesComponent extends SkolansBaseComponent implements OnInit {
  protected readonly classification = signal<SubjectClassificationContext | null>(null);
  protected readonly items = signal<SubjectSubcategory[]>([]);
  protected readonly selected = signal<SubjectSubcategory[]>([]);

  protected readonly orderingMode = signal(false);
  protected readonly savingOrder = signal(false);

  protected readonly subjectClassificationId = signal<number | null>(null);

  protected readonly hasSelection = computed(() => this.selected().length > 0);
  protected readonly hasSingleSelection = computed(() => this.selected().length === 1);

  protected readonly tablePagination = computed(
    () => !this.orderingMode() && this.items().length > 10,
  );

  protected readonly getRowId = (params: { data: SubjectSubcategory }) => String(params.data.id);

  protected readonly columnDefs = computed<ColDef<SubjectSubcategory>[]>(() => {
    const ordering = this.orderingMode();

    const columns: ColDef<SubjectSubcategory>[] = [
      {
        field: 'name',
        headerValueGetter: () =>
          this.translate.instant('academics.subject-subcategories.fields.name'),
        flex: 1,
        sortable: !ordering,
      },
      {
        field: 'translation',
        headerValueGetter: () =>
          this.translate.instant('academics.subject-subcategories.fields.translation'),
        flex: 1.5,
        sortable: !ordering,
      },
      {
        field: 'active',
        headerValueGetter: () =>
          this.translate.instant('academics.subject-subcategories.fields.active'),
        width: 120,
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
    this.selected.set(rows as SubjectSubcategory[]);
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
    this.items.set(rows as SubjectSubcategory[]);
  }

  protected saveOrder(): void {
    const route = this.apiRoute();
    const subjectClassificationId = this.subjectClassificationId();

    if (!route || !subjectClassificationId || this.savingOrder()) return;

    const ids = this.items().map((item) => item.id);

    this.savingOrder.set(true);

    this.request(
      this.api.put<SubjectSubcategoriesIndexData>(`${route}/set-order`, {
        ids,
        subject_classification_id: subjectClassificationId,
      }),
    ).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) return;

        this.handleApiSuccess(res);

        const items = res.data?.['subject-subcategories'] ?? this.items();
        this.items.set([...items].sort((a, b) => a.order - b.order));

        this.orderingMode.set(false);
        this.selected.set([]);
      },
      error: () => this.ignoreHandledRequestError(),
      complete: () => this.savingOrder.set(false),
    });
  }

  protected reload(): void {
    const route = this.apiRoute();
    const subjectClassificationId = this.subjectClassificationId();

    if (!route || !subjectClassificationId) return;

    this.clearScreenOptions();

    this.request(
      this.api.get<SubjectSubcategoriesIndexData>(`${route}/${subjectClassificationId}`),
    ).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) return;

        this.classification.set(res.data?.['subject-classification'] ?? null);
        this.items.set(res.data?.['subject-subcategories'] ?? []);
        this.setScreenOptions(res.data?.options);
        this.selected.set([]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  ngOnInit(): void {
    this.initRouteMeta();

    const id = Number(this.activatedRoute.snapshot.paramMap.get('subjectClassificationId'));

    this.subjectClassificationId.set(Number.isFinite(id) && id > 0 ? id : null);
    this.reload();
  }

  protected async onAdd(): Promise<void> {
    const route = this.apiRoute();
    const subjectClassificationId = this.subjectClassificationId();

    if (!route || !subjectClassificationId) return;

    const result = await this.modal.open<
      { subjectClassificationId: number; item: SubjectSubcategory | null; order: number },
      ISubjectSubCategoryModalResult
    >({
      component: SubjectSubCategoryModalComponent,
      data: {
        subjectClassificationId,
        item: null,
        order: this.items().length,
      },
      title: this.translate.instant('academics.subject-subcategories.add'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) return;

    this.request(this.api.post<SubjectSubcategoryMutationData>(route, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) return;

        this.handleApiSuccess(res);

        const item = res.data?.['subject-subcategory'] ?? res.data?.item;

        if (!item) {
          this.reload();
          return;
        }

        this.items.update((current) => [...current, item].sort((a, b) => a.order - b.order));
        this.selected.set([]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  protected async onEdit(): Promise<void> {
    const route = this.apiRoute();
    const subjectClassificationId = this.subjectClassificationId();
    const item = this.selected()[0];

    if (!route || !subjectClassificationId || !item) return;

    const result = await this.modal.open<
      { subjectClassificationId: number; item: SubjectSubcategory | null; order: number },
      ISubjectSubCategoryModalResult
    >({
      component: SubjectSubCategoryModalComponent,
      data: {
        subjectClassificationId,
        item,
        order: item.order,
      },
      title: this.translate.instant('academics.subject-subcategories.update'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) return;

    this.request(
      this.api.put<SubjectSubcategoryMutationData>(`${route}/${item.id}`, result.payload),
    ).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) return;

        this.handleApiSuccess(res);

        const updated = res.data?.['subject-subcategory'] ?? res.data?.item;

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
    const route = this.apiRoute();
    const item = this.selected()[0];

    if (!route || !item) return;

    const confirmed = await this.modal.open<ConfirmModalData, boolean>({
      component: SklConfirmModal,
      title: this.translate.instant('academics.subject-subcategories.delete'),
      data: {
        message: this.translate.instant('academics.subject-subcategories.messages.confirm-delete'),
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

    this.request(this.api.delete<SubjectSubcategoriesIndexData>(`${route}/${item.id}`)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) return;

        this.handleApiSuccess(res);

        const items = res.data?.['subject-subcategories'];

        if (items) {
          this.items.set([...items].sort((a, b) => a.order - b.order));
        } else {
          this.items.update((current) => current.filter((row) => row.id !== item.id));
        }

        this.selected.set([]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }
}
