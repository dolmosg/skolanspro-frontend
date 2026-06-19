import { Component, OnInit, computed, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { BaseCrud } from '@shared/base/base-crud';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { ColDef, GetRowIdParams } from 'ag-grid-community';

import {
  GradebookSectionTypeModalComponent,
  GradebookSectionTypeModalData,
  GradebookSectionTypeModalResult,
} from '../gradebook-section-type-modal/gradebook-section-type-modal.component';
import { ScreenOptionItem } from '@shared/interfaces/access.interfaces';

export interface IGradebookSectionType {
  id: number;
  name: string;
  translation: string | null;
  configurable: boolean;
  active: boolean;
  order: number;
}

export interface GradebookSectionTypesIndexData {
  'gradebook-section-types': IGradebookSectionType[];
  'gradebook-section-type'?: IGradebookSectionType;
  options?: ScreenOptionItem[];
}

@Component({
  selector: 'app-gradebook-section-types',
  standalone: true,
  imports: [TranslatePipe, UiButtonComponent, SkolansTable],
  templateUrl: './gradebook-section-types.component.html',
  styleUrl: './gradebook-section-types.component.scss',
})
export class GradebookSectionTypesComponent
  extends BaseCrud<IGradebookSectionType>
  implements OnInit
{
  protected readonly sectionTypes = signal<IGradebookSectionType[]>([]);
  protected readonly selected = signal<IGradebookSectionType[]>([]);

  protected readonly ordering = signal(false);
  protected readonly savingOrder = signal(false);
  protected readonly originalOrder = signal<IGradebookSectionType[]>([]);

  protected readonly hasSelection = computed(() => this.selected().length > 0);
  protected readonly hasSingleSelection = computed(() => this.selected().length === 1);

  protected readonly tablePagination = computed(() => {
    return !this.ordering() && this.sectionTypes().length > 10;
  });

  protected readonly columnDefs = computed<ColDef<IGradebookSectionType>[]>(() => {
    const ordering = this.ordering();

    const columns: ColDef<IGradebookSectionType>[] = [
      {
        field: 'name',
        headerValueGetter: () =>
          this.translate.instant('configuration.gradebook-section-types.fields.name'),
        flex: 1,
        minWidth: 180,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'translation',
        headerValueGetter: () =>
          this.translate.instant('configuration.gradebook-section-types.fields.translation'),
        flex: 1.5,
        minWidth: 240,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
        valueGetter: (params) =>
          params.data?.translation
            ? this.translate.instant(params.data.translation)
            : (params.data?.name ?? ''),
      },
      {
        field: 'configurable',
        headerValueGetter: () =>
          this.translate.instant('configuration.gradebook-section-types.fields.configurable'),
        width: 150,
        minWidth: 150,
        sortable: !ordering,
        filter: false,
        valueGetter: (params) =>
          params.data?.configurable
            ? this.translate.instant('common.yes')
            : this.translate.instant('common.no'),
      },
      {
        field: 'active',
        headerValueGetter: () => this.translate.instant('common.active'),
        width: 130,
        minWidth: 130,
        sortable: !ordering,
        filter: false,
        valueGetter: (params) =>
          params.data?.active
            ? this.translate.instant('common.active')
            : this.translate.instant('common.inactive'),
      },
      {
        field: 'order',
        headerValueGetter: () => this.translate.instant('common.order'),
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

  protected readonly getRowId = (params: GetRowIdParams<IGradebookSectionType>): string => {
    return String(params.data.id);
  };

  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadSectionTypes();
  }

  protected reloadSectionTypes(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest<GradebookSectionTypesIndexData>(this.api.get(route), (res) => {
      this.sectionTypes.set(res.data['gradebook-section-types'] ?? []);
      this.setScreenOptions(res.data.options);
      this.clearSelection(this.selected);
    });
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selected.set(rows as IGradebookSectionType[]);
  }

  protected startOrdering(): void {
    this.originalOrder.set([...this.sectionTypes()]);
    this.clearSelection(this.selected);
    this.ordering.set(true);
  }

  protected onRowOrderChange(rows: unknown[]): void {
    this.sectionTypes.set(this.normalizeOrder(rows as IGradebookSectionType[]));
  }

  protected cancelOrdering(): void {
    this.sectionTypes.set([...this.originalOrder()]);
    this.originalOrder.set([]);
    this.ordering.set(false);
    this.savingOrder.set(false);
  }

  protected saveOrder(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.savingOrder.set(true);

    this.executeSilentRequest<GradebookSectionTypesIndexData>(
      this.api.put(`${route}/set-order`, {
        ids: this.sectionTypes().map((item) => item.id),
      }),
      (res) => {
        this.handleApiSuccess(res);
        this.sectionTypes.set(res.data['gradebook-section-types'] ?? this.sectionTypes());
        this.originalOrder.set([]);
        this.ordering.set(false);
        this.savingOrder.set(false);
        this.clearSelection(this.selected);
      },
      () => {
        this.savingOrder.set(false);
      },
    );
  }

  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<
      GradebookSectionTypeModalData,
      GradebookSectionTypeModalResult
    >({
      component: GradebookSectionTypeModalComponent,
      data: {
        item: null,
      },
      title: this.translate.instant('configuration.gradebook-section-types.add'),
      description: this.translate.instant(
        'configuration.gradebook-section-types.messages.create-description',
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
      order: this.sectionTypes().length,
    };

    this.executeMutationRequest<GradebookSectionTypesIndexData>(
      this.api.post(route, payload),
      (res) => {
        this.sectionTypes.set(res.data['gradebook-section-types'] ?? this.sectionTypes());
        this.clearSelection(this.selected);
      },
    );
  }

  protected async onEdit(): Promise<void> {
    const item = this.selected()[0];

    if (!item) {
      return;
    }

    const result = await this.modal.open<
      GradebookSectionTypeModalData,
      GradebookSectionTypeModalResult
    >({
      component: GradebookSectionTypeModalComponent,
      data: {
        item,
      },
      title: this.translate.instant('configuration.gradebook-section-types.update'),
      description: this.translate.instant(
        'configuration.gradebook-section-types.messages.update-description',
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

    this.executeMutationRequest<GradebookSectionTypesIndexData>(
      this.api.put(`${route}/${item.id}`, result.payload),
      (res) => {
        const updated = res.data['gradebook-section-type'];

        this.sectionTypes.set(res.data['gradebook-section-types'] ?? this.sectionTypes());

        if (updated) {
          this.selected.set([updated]);
        }
      },
    );
  }

  protected async onDelete(): Promise<void> {
    const item = this.selected()[0];

    if (!item) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.gradebook-section-types.delete',
      'configuration.gradebook-section-types.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeMutationRequest<GradebookSectionTypesIndexData>(
      this.api.delete(`${route}/${item.id}`),
      (res) => {
        this.sectionTypes.set(res.data['gradebook-section-types'] ?? this.sectionTypes());
        this.clearSelection(this.selected);
      },
    );
  }
}