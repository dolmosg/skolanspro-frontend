import { Component, computed, OnInit, signal, Type } from '@angular/core';
import { TranslateModule, TranslatePipe } from '@ngx-translate/core';
import { ColDef, GetRowIdParams } from 'ag-grid-community';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { SklConfirmModal } from '@shared/base/skl-confirm-modal/skl-confirm-modal';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import {
  QuestionInputTypeModalComponent,
  IQuestionInputTypeModalData,
  IQuestionInputTypeModalResult,
} from '../question-input-type-modal/question-input-type-modal.component';

export interface QuestionInputTypeItem {
  id: number;
  name: string;
  translation: string | null;
  component: string | null;
  active: boolean;
  order: number;
}

interface QuestionInputTypesRouteData {
  collectionKey: string;
  itemKey: string;
  title: string;
}

interface QuestionInputTypesIndexData {
  'question-input-types'?: QuestionInputTypeItem[];
  options?: Parameters<SkolansBaseComponent['setScreenOptions']>[0];
}

interface QuestionInputTypeMutationData {
  'question-input-type'?: QuestionInputTypeItem;
  'question-input-types'?: QuestionInputTypeItem[];
}

interface QuestionInputTypesOrderData {
  'question-input-types'?: QuestionInputTypeItem[];
}

@Component({
  selector: 'app-question-input-types',
  standalone: true,
  imports: [TranslateModule, TranslatePipe, UiButtonComponent, SkolansTable],
  templateUrl: './question-input-types.component.html',
  styleUrl: './question-input-types.component.scss',
})
export class QuestionInputTypesComponent extends SkolansBaseComponent implements OnInit {
  protected readonly catalog = signal<QuestionInputTypeItem[]>([]);
  protected readonly selectedItems = signal<QuestionInputTypeItem[]>([]);
  protected readonly config = signal<QuestionInputTypesRouteData | null>(null);

  protected readonly orderingMode = signal(false);
  protected readonly savingOrder = signal(false);

  protected readonly hasSelection = computed(() => this.selectedItems().length > 0);
  protected readonly hasSingleSelection = computed(() => this.selectedItems().length === 1);
  protected readonly tablePagination = computed(
    () => !this.orderingMode() && this.catalog().length > 10,
  );

  protected readonly columnDefs = computed<ColDef<QuestionInputTypeItem>[]>(() => {
    const ordering = this.orderingMode();

    const columns: ColDef<QuestionInputTypeItem>[] = [
      {
        headerValueGetter: () =>
          this.translate.instant('configuration.question-input-types.fields.name'),
        field: 'name',
        flex: 1,
        minWidth: 180,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        headerValueGetter: () =>
          this.translate.instant('configuration.question-input-types.fields.translation'),
        field: 'translation',
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
        headerValueGetter: () =>
          this.translate.instant('configuration.question-input-types.fields.component'),
        field: 'component',
        width: 200,
        minWidth: 200,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        headerValueGetter: () =>
          this.translate.instant('configuration.question-input-types.fields.active'),
        field: 'active',
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
        headerValueGetter: () =>
          this.translate.instant('configuration.question-input-types.fields.order'),
        field: 'order',
        width: 110,
        minWidth: 110,
        sortable: !ordering,
        filter: false,
        floatingFilter: false,
      },
    ];

    if (!ordering) return columns;

    return [
      {
        colId: 'drag',
        width: 56,
        rowDrag: true,
      },
      ...columns,
    ];
  });

  protected readonly getRowId = (params: GetRowIdParams<QuestionInputTypeItem>): string =>
    String(params.data.id);

  ngOnInit(): void {
    this.initRouteMeta();

    const data = this.activatedRoute.snapshot.data as QuestionInputTypesRouteData;

    this.config.set({
      collectionKey: data.collectionKey,
      itemKey: data.itemKey,
      title: data.title,
    });

    this.loadCatalog();
  }

  protected onSelectionChange(selection: unknown[]): void {
    this.selectedItems.set(selection as QuestionInputTypeItem[]);
  }

  protected loadCatalog(): void {
    const route = this.apiRoute();

    if (!route) return;

    this.executeSilentRequest<QuestionInputTypesIndexData | QuestionInputTypeItem[]>(
      this.api.get(route),
      (response) => {
        this.catalog.set(this.extractItems(response.data));
        this.setScreenOptions(Array.isArray(response.data) ? undefined : response.data?.options);
        this.selectedItems.set([]);
      },
      () => {
        this.catalog.set([]);
        this.setScreenOptions([]);
        this.selectedItems.set([]);
      },
    );
  }

  protected async openCreateModal(): Promise<void> {
    const config = this.config();
    const route = this.apiRoute();
    if (!config || !route) return;

    const result = await this.modal.open<
      IQuestionInputTypeModalData,
      IQuestionInputTypeModalResult
    >({
      component: QuestionInputTypeModalComponent,
      data: {
        title: config.title,
        collectionKey: config.collectionKey,
        item: null,
        order: this.catalog().length,
      },
      title: this.translate.instant(config.title),
      description: this.translate.instant(
        'configuration.question-input-types.messages.create-description',
      ),
      size: 'md',
    });

    if (!result?.saved) return;

    this.executeMutationRequest(
      this.api.post<QuestionInputTypeMutationData>(route, result.payload),
      () => this.loadCatalog(),
    );
  }

  protected async openEditModal(item?: QuestionInputTypeItem): Promise<void> {
    const config = this.config();
    const route = this.apiRoute();
    const selected = item ?? this.selectedItems()[0];

    if (!config || !route || !selected) return;

    const result = await this.modal.open<
      IQuestionInputTypeModalData,
      IQuestionInputTypeModalResult
    >({
      component: QuestionInputTypeModalComponent,
      data: {
        title: config.title,
        collectionKey: config.collectionKey,
        item: selected,
        order: selected.order,
      },
      title: this.translate.instant(config.title),
      description: this.translate.instant(
        'configuration.question-input-types.messages.edit-description',
      ),
      size: 'md',
    });

    if (!result?.saved) return;

    this.executeMutationRequest(this.api.put(`${route}/${selected.id}`, result.payload), () =>
      this.loadCatalog(),
    );
  }

  protected async deleteItem(item?: QuestionInputTypeItem): Promise<void> {
    const selected = item ?? this.selectedItems()[0];
    const route = this.apiRoute();

    if (!route || !selected) return;

    const confirmed = await this.modal.open<any, boolean>({
      component: SklConfirmModal as Type<unknown>,
      data: {
        message: this.translate.instant(
          'configuration.question-input-types.messages.confirm-delete',
        ),
        confirmLabel: this.translate.instant('common.delete'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'danger',
      },
      title: this.translate.instant('configuration.question-input-types.delete'),
      size: 'sm',
      closeOnBackdrop: false,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) return;

    this.executeMutationRequest(this.api.delete(`${route}/${selected.id}`), () =>
      this.loadCatalog(),
    );
  }

  protected startOrdering(): void {
    this.orderingMode.set(true);
    this.selectedItems.set([]);
  }

  protected cancelOrdering(): void {
    this.orderingMode.set(false);
    this.selectedItems.set([]);
    this.loadCatalog();
  }

  protected onRowOrderChange(event: unknown): void {
    if (!Array.isArray(event)) return;

    this.catalog.set(
      (event as QuestionInputTypeItem[]).map((item, index) => ({
        ...item,
        order: index,
      })),
    );
  }

  protected saveOrder(): void {
    const route = this.apiRoute();
    if (!route) return;

    const ids = this.catalog().map((item) => item.id);

    this.executeSilentRequest(this.api.put(`${route}/set-order`, { ids }), () => {
      this.orderingMode.set(false);
      this.selectedItems.set([]);
    });
  }

  private extractItems(data: any): QuestionInputTypeItem[] {
    return data?.['question-input-types'] ?? [];
  }
}
