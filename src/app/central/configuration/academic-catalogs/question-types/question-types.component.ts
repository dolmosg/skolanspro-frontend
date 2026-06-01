import { Component, computed, OnInit, signal, Type } from '@angular/core';
import { TranslateModule, TranslatePipe } from '@ngx-translate/core';
import { ColDef, GetRowIdParams } from 'ag-grid-community';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { SklConfirmModal } from '@shared/base/skl-confirm-modal/skl-confirm-modal';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import {
  QuestionTypeModalComponent,
  IQuestionTypeModalData,
  IQuestionTypeModalResult,
} from '../question-type-modal/question-type-modal.component';

import {
  QuestionTypeInputTypesConfigModalComponent,
  IQuestionTypeInputTypesConfigModalResult,
} from '../question-type-input-types-config-modal/question-type-input-types-config-modal.component';

export interface QuestionInputTypeItem {
  id: number;
  name: string;
  translation: string | null;
  component: string | null;
  active: boolean;
  order: number;
  pivot?: {
    is_default: boolean;
    active: boolean;
    order: number;
  };
}

export interface QuestionTypeItem {
  id: number;
  name: string;
  translation: string | null;
  show_instructions: boolean;
  show_question: boolean;
  active: boolean;
  order: number;
  input_types?: QuestionInputTypeItem[];
}

interface QuestionTypesRouteData {
  collectionKey: string;
  itemKey: string;
  title: string;
}

interface QuestionTypesIndexData {
  'question-types'?: QuestionTypeItem[];
  'question-input-types'?: QuestionInputTypeItem[];
  options?: Parameters<SkolansBaseComponent['setScreenOptions']>[0];
}

interface QuestionTypeMutationData {
  'question-type'?: QuestionTypeItem;
  'question-types'?: QuestionTypeItem[];
}

interface QuestionTypesOrderData {
  'question-types'?: QuestionTypeItem[];
}

@Component({
  selector: 'app-question-types',
  standalone: true,
  imports: [TranslateModule, TranslatePipe, UiButtonComponent, SkolansTable],
  templateUrl: './question-types.component.html',
  styleUrl: './question-types.component.scss',
})
export class QuestionTypesComponent extends SkolansBaseComponent implements OnInit {
  protected readonly catalog = signal<QuestionTypeItem[]>([]);
  protected readonly selectedItems = signal<QuestionTypeItem[]>([]);
  protected readonly config = signal<QuestionTypesRouteData | null>(null);
  protected readonly questionInputTypes = signal<QuestionInputTypeItem[]>([]);

  protected readonly orderingMode = signal(false);
  protected readonly savingOrder = signal(false);

  protected readonly title = computed(() => this.config()?.title ?? '');
  protected readonly itemsCount = computed(() => this.catalog().length);

  protected readonly hasSelection = computed(() => this.selectedItems().length > 0);
  protected readonly hasSingleSelection = computed(() => this.selectedItems().length === 1);
  protected readonly tablePagination = computed(
    () => !this.orderingMode() && this.catalog().length > 10,
  );

  protected readonly columnDefs = computed<ColDef<QuestionTypeItem>[]>(() => {
    const ordering = this.orderingMode();

    const columns: ColDef<QuestionTypeItem>[] = [
      {
        headerValueGetter: () => this.translate.instant('configuration.question-types.fields.name'),
        field: 'name',
        flex: 1,
        minWidth: 180,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        headerValueGetter: () =>
          this.translate.instant('configuration.question-types.fields.translation'),
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
          this.translate.instant('configuration.question-types.fields.show-instructions'),
        field: 'show_instructions',
        width: 190,
        minWidth: 190,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
        valueGetter: (params) =>
          params.data?.show_instructions
            ? this.translate.instant('common.yes')
            : this.translate.instant('common.no'),
      },
      {
        headerValueGetter: () =>
          this.translate.instant('configuration.question-types.fields.show-question'),
        field: 'show_question',
        width: 170,
        minWidth: 170,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
        valueGetter: (params) =>
          params.data?.show_question
            ? this.translate.instant('common.yes')
            : this.translate.instant('common.no'),
      },
      {
        headerValueGetter: () =>
          this.translate.instant('configuration.question-types.fields.active'),
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
          this.translate.instant('configuration.question-types.fields.order'),
        field: 'order',
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

  protected readonly getRowId = (params: GetRowIdParams<QuestionTypeItem>): string => {
    return String(params.data.id);
  };

  ngOnInit(): void {
    this.initRouteMeta();

    const data = this.activatedRoute.snapshot.data as QuestionTypesRouteData;

    this.config.set({
      collectionKey: data.collectionKey,
      itemKey: data.itemKey,
      title: data.title,
    });

    this.loadCatalog();
  }

  protected onSelectionChange(selection: unknown[]): void {
    this.selectedItems.set(selection as QuestionTypeItem[]);
  }

  protected loadCatalog(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest<QuestionTypesIndexData | QuestionTypeItem[]>(
      this.api.get(route),
      (response) => {
        this.catalog.set(this.extractItems(response.data));

        this.questionInputTypes.set(
          Array.isArray(response.data) ? [] : (response.data?.['question-input-types'] ?? []),
        );

        this.setScreenOptions(Array.isArray(response.data) ? undefined : response.data?.options);
        this.selectedItems.set([]);
      },
      () => {
        this.catalog.set([]);
        this.questionInputTypes.set([]);
        this.setScreenOptions([]);
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
    this.loadCatalog();
  }

  protected onRowOrderChange(event: unknown): void {
    if (!Array.isArray(event)) {
      return;
    }

    this.catalog.set(
      (event as QuestionTypeItem[]).map((item, index) => ({
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

    const ids = this.catalog().map((item) => item.id);

    this.savingOrder.set(true);

    this.executeSilentRequest<QuestionTypesOrderData | QuestionTypeItem[]>(
      this.api.put(`${route}/set-order`, { ids }),
      (response) => {
        this.handleApiSuccess(response);

        this.catalog.set(this.extractItems(response.data, this.catalog()));
        this.orderingMode.set(false);
        this.selectedItems.set([]);
        this.savingOrder.set(false);
      },
      () => {
        this.savingOrder.set(false);
      },
    );
  }

  protected trackById(_: number, item: QuestionTypeItem): number {
    return item.id;
  }

  private extractItem(data: QuestionTypeMutationData | undefined): QuestionTypeItem | null {
    const candidate = data?.['question-type'];

    if (!candidate || !this.isQuestionTypeItem(candidate)) {
      return null;
    }

    return candidate;
  }

  private extractItems(
    data: QuestionTypesIndexData | QuestionTypesOrderData | QuestionTypeItem[] | undefined,
    fallback: QuestionTypeItem[] = [],
  ): QuestionTypeItem[] {
    if (Array.isArray(data)) {
      return this.sortItems(data);
    }

    const items = data?.['question-types'];

    if (!Array.isArray(items)) {
      return this.sortItems(fallback);
    }

    return this.sortItems(items);
  }

  private sortItems(items: QuestionTypeItem[]): QuestionTypeItem[] {
    return [...items].sort((a, b) => a.order - b.order);
  }

  private isQuestionTypeItem(value: unknown): value is QuestionTypeItem {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const item = value as Partial<QuestionTypeItem>;

    return (
      typeof item.id === 'number' &&
      typeof item.name === 'string' &&
      (typeof item.translation === 'string' || item.translation === null) &&
      typeof item.show_instructions === 'boolean' &&
      typeof item.show_question === 'boolean' &&
      typeof item.active === 'boolean' &&
      typeof item.order === 'number'
    );
  }

  protected async openCreateModal(): Promise<void> {
    const config = this.config();
    const route = this.apiRoute();

    if (!config || !route) {
      return;
    }

    const result = await this.modal.open<IQuestionTypeModalData, IQuestionTypeModalResult>({
      component: QuestionTypeModalComponent,
      data: {
        title: config.title,
        collectionKey: config.collectionKey,
        item: null,
        order: this.catalog().length,
      },
      title: this.translate.instant(config.title),
      description: this.translate.instant(
        'configuration.question-types.messages.create-description',
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
      this.api.post<QuestionTypeMutationData>(route, result.payload),
      (response) => {
        const created = this.extractItem(response.data);

        if (!created) {
          this.loadCatalog();
          return;
        }

        this.catalog.set(this.extractItems(response.data, [...this.catalog(), created]));
        this.selectedItems.set([]);
      },
    );
  }

  protected async openEditModal(item?: QuestionTypeItem): Promise<void> {
    const config = this.config();
    const route = this.apiRoute();
    const selected = item ?? this.selectedItems()[0];

    if (!config || !route || !selected) {
      return;
    }

    const result = await this.modal.open<IQuestionTypeModalData, IQuestionTypeModalResult>({
      component: QuestionTypeModalComponent,
      data: {
        title: config.title,
        collectionKey: config.collectionKey,
        item: selected,
        order: selected.order,
      },
      title: this.translate.instant(config.title),
      description: this.translate.instant('configuration.question-types.messages.edit-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.executeMutationRequest(
      this.api.put<QuestionTypeMutationData>(`${route}/${selected.id}`, {
        ...result.payload,
        order: selected.order,
      }),
      (response) => {
        const updated = this.extractItem(response.data);

        if (!updated) {
          this.loadCatalog();
          return;
        }

        const fallback = this.catalog().map((catalogItem) =>
          catalogItem.id === updated.id ? updated : catalogItem,
        );

        this.catalog.set(this.extractItems(response.data, fallback));
        this.selectedItems.set([updated]);
      },
    );
  }

  protected async deleteItem(item?: QuestionTypeItem): Promise<void> {
    const selected = item ?? this.selectedItems()[0];
    const route = this.apiRoute();

    if (!route || !selected) {
      return;
    }

    const confirmed = await this.modal.open<any, boolean>({
      component: SklConfirmModal as Type<unknown>,
      data: {
        message: this.translate.instant('configuration.question-types.messages.confirm-delete'),
        confirmLabel: this.translate.instant('common.delete'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'danger',
      },
      title: this.translate.instant('configuration.question-types.delete'),
      size: 'sm',
      closeOnBackdrop: false,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) {
      return;
    }

    this.executeMutationRequest(
      this.api.delete<QuestionTypesIndexData>(`${route}/${selected.id}`),
      (response) => {
        const fallback = this.catalog().filter((catalogItem) => catalogItem.id !== selected.id);

        this.catalog.set(this.extractItems(response.data, fallback));
        this.selectedItems.set([]);
      },
    );
  }

  protected async openInputTypesModal(): Promise<void> {
    const route = this.apiRoute();
    const selected = this.selectedItems()[0];

    if (!route || !selected) {
      return;
    }

    const result = await this.modal.open<
      {
        questionType: QuestionTypeItem;
        inputTypes: QuestionInputTypeItem[];
      },
      IQuestionTypeInputTypesConfigModalResult
    >({
      component: QuestionTypeInputTypesConfigModalComponent,
      data: {
        questionType: selected,
        inputTypes: this.questionInputTypes(),
      },
      title: this.translate.instant('configuration.question-types.configure-input-types'),
      description: this.translate.instant(
        'configuration.question-types.messages.configure-input-types-description',
      ),
      size: 'lg',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.executeMutationRequest(
      this.api.put<QuestionTypeMutationData>(`${route}/sync-input-types/${selected.id}`, {
        items: result.items,
      }),
      (response) => {
        const updated = this.extractItem(response.data);

        if (!updated) {
          this.loadCatalog();
          return;
        }

        const fallback = this.catalog().map((item) => (item.id === updated.id ? updated : item));

        this.catalog.set(this.extractItems(response.data, fallback));
        this.selectedItems.set([updated]);
      },
    );
  }
}
