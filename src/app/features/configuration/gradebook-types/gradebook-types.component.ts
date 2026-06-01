import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ColDef, GetRowIdParams } from 'ag-grid-community';

import { BaseCrud } from '@shared/base/base-crud';
import { ScreenOptionItem } from '@shared/interfaces/configuration.interfaces';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import {
  GradeBookTypeModalComponent,
  GradeBookTypeModalData,
  GradeBookTypeModalResult,
} from '../grade-book-type-modal/grade-book-type-modal.component';

import {
  GradebookTypeActionsModalComponent,
  GradebookTypeActionsModalData,
  GradebookTypeActionsModalResult,
  IGradebookAction,
  IGradebookTypeAction,
} from '../gradebook-type-actions-modal/gradebook-type-actions-modal.component';

import {
  GradebookTypeOptionsModalComponent,
  GradebookTypeOptionsModalData,
  GradebookTypeOptionsModalResult,
  IGradebookOption,
  IGradebookTypeOption,
} from '../gradebook-type-options-modal/gradebook-type-options-modal.component';

export interface IGradebookTypeRelation {
  id: number;
  name: string;
  translation: string | null;
  active: boolean;
  order: number;
  pivot?: {
    active: boolean;
    order: number;
  };
}

export interface IGradebookType {
  id: number;
  name: string;
  translation: string | null;
  subjects: boolean;
  integrations: boolean;
  aspects: boolean;
  sections: boolean;
  rubrics: boolean;
  active: boolean;
  order: number;
  options: IGradebookTypeRelation[];
  actions: IGradebookTypeRelation[];
}

interface GradebookTypesIndexData {
  'gradebook-types': IGradebookType[];
  'gradebook-type'?: IGradebookType;
  options?: ScreenOptionItem[];
}

interface GradebookTypeOptionsData {
  'gradebook-type': IGradebookType;
  'available-gradebook-options': IGradebookOption[];
  'gradebook-type-options': IGradebookTypeOption[];
  options?: ScreenOptionItem[];
}

interface GradebookTypeActionsData {
  'gradebook-type': IGradebookType;
  'available-gradebook-actions': IGradebookAction[];
  'gradebook-type-actions': IGradebookTypeAction[];
  options?: ScreenOptionItem[];
}

@Component({
  selector: 'app-gradebook-types',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './gradebook-types.component.html',
  styleUrl: './gradebook-types.component.scss',
})
export class GradebookTypesComponent extends BaseCrud<IGradebookType> implements OnInit {
  protected readonly gradebookTypes = signal<IGradebookType[]>([]);
  protected readonly selectedGradebookTypes = signal<IGradebookType[]>([]);

  protected readonly orderingMode = signal(false);
  protected readonly savingOrder = signal(false);
  protected readonly originalOrder = signal<IGradebookType[]>([]);

  protected readonly hasSelection = computed(() => this.selectedGradebookTypes().length > 0);
  protected readonly hasSingleSelection = computed(
    () => this.selectedGradebookTypes().length === 1,
  );

  protected readonly tablePagination = computed(() => {
    return !this.orderingMode() && this.gradebookTypes().length > 10;
  });

  protected readonly columnDefs = computed<ColDef<IGradebookType>[]>(() => {
    const ordering = this.orderingMode();

    const columns: ColDef<IGradebookType>[] = [
      {
        field: 'name',
        headerValueGetter: () =>
          this.translate.instant('configuration.gradebook-types.fields.name'),
        flex: 1,
        minWidth: 180,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'translation',
        headerValueGetter: () =>
          this.translate.instant('configuration.gradebook-types.fields.translation'),
        flex: 1.5,
        minWidth: 220,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
        cellRenderer: (params: any) => {
          if (!params.value) {
            return '';
          }

          return this.translate.instant(params.value);
        },
      },
      {
        field: 'subjects',
        headerValueGetter: () =>
          this.translate.instant('configuration.gradebook-types.fields.subjects'),
        width: 120,
        sortable: !ordering,
        filter: false,
      },
      {
        field: 'integrations',
        headerValueGetter: () =>
          this.translate.instant('configuration.gradebook-types.fields.integrations'),
        width: 130,
        sortable: !ordering,
        filter: false,
      },
      {
        field: 'aspects',
        headerValueGetter: () =>
          this.translate.instant('configuration.gradebook-types.fields.aspects'),
        width: 120,
        sortable: !ordering,
        filter: false,
      },
      {
        field: 'sections',
        headerValueGetter: () =>
          this.translate.instant('configuration.gradebook-types.fields.sections'),
        width: 120,
        sortable: !ordering,
        filter: false,
      },
      {
        field: 'rubrics',
        headerValueGetter: () =>
          this.translate.instant('configuration.gradebook-types.fields.rubrics'),
        width: 120,
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

  protected readonly getRowId = (params: GetRowIdParams<IGradebookType>): string => {
    return String(params.data.id);
  };

  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadGradebookTypes();
  }

  protected reloadGradebookTypes(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest<GradebookTypesIndexData>(this.api.get(route), (res) => {
      this.gradebookTypes.set(res.data['gradebook-types'] ?? []);
      this.setScreenOptions(res.data.options);
      this.clearSelection(this.selectedGradebookTypes);
    });
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedGradebookTypes.set(rows as IGradebookType[]);
  }

  protected startOrdering(): void {
    this.originalOrder.set([...this.gradebookTypes()]);
    this.clearSelection(this.selectedGradebookTypes);
    this.orderingMode.set(true);
  }

  protected cancelOrdering(): void {
    this.gradebookTypes.set([...this.originalOrder()]);
    this.originalOrder.set([]);
    this.orderingMode.set(false);
    this.savingOrder.set(false);
  }

  protected onRowOrderChange(rows: unknown[]): void {
    this.gradebookTypes.set(this.normalizeOrder(rows as IGradebookType[]));
  }

  protected saveOrder(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.savingOrder.set(true);

    this.executeSilentRequest<GradebookTypesIndexData>(
      this.api.put(`${route}/set-order`, {
        ids: this.gradebookTypes().map((item) => item.id),
      }),
      (res) => {
        this.handleApiSuccess(res);
        this.gradebookTypes.set(res.data['gradebook-types'] ?? this.gradebookTypes());
        this.originalOrder.set([]);
        this.orderingMode.set(false);
        this.savingOrder.set(false);
        this.clearSelection(this.selectedGradebookTypes);
      },
      () => {
        this.savingOrder.set(false);
      },
    );
  }

  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<GradeBookTypeModalData, GradeBookTypeModalResult>({
      component: GradeBookTypeModalComponent,
      data: {
        item: null,
      },
      title: this.translate.instant('configuration.gradebook-types.add'),
      description: this.translate.instant(
        'configuration.gradebook-types.messages.create-description',
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
      order: this.gradebookTypes().length,
    };

    this.executeMutationRequest<GradebookTypesIndexData>(this.api.post(route, payload), (res) => {
      this.gradebookTypes.set(res.data['gradebook-types'] ?? this.gradebookTypes());
      this.clearSelection(this.selectedGradebookTypes);
    });
  }

  protected async onEdit(): Promise<void> {
    const item = this.selectedGradebookTypes()[0];

    if (!item) {
      return;
    }

    const result = await this.modal.open<GradeBookTypeModalData, GradeBookTypeModalResult>({
      component: GradeBookTypeModalComponent,
      data: {
        item,
      },
      title: this.translate.instant('configuration.gradebook-types.update'),
      description: this.translate.instant(
        'configuration.gradebook-types.messages.update-description',
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

    this.executeMutationRequest<GradebookTypesIndexData>(
      this.api.put(`${route}/${item.id}`, result.payload),
      (res) => {
        const updated = res.data['gradebook-type'];

        this.gradebookTypes.set(res.data['gradebook-types'] ?? this.gradebookTypes());

        if (updated) {
          this.selectedGradebookTypes.set([updated]);
        }
      },
    );
  }

  protected async onDelete(): Promise<void> {
    const item = this.selectedGradebookTypes()[0];

    if (!item) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.gradebook-types.delete',
      'configuration.gradebook-types.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeMutationRequest<GradebookTypesIndexData>(
      this.api.delete(`${route}/${item.id}`),
      (res) => {
        this.gradebookTypes.set(res.data['gradebook-types'] ?? this.gradebookTypes());
        this.clearSelection(this.selectedGradebookTypes);
      },
    );
  }

  protected onConfigureOptions(): void {
    const item = this.selectedGradebookTypes()[0];

    if (!item) {
      return;
    }

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest<GradebookTypeOptionsData>(
      this.api.get(`${route}/options/${item.id}`),
      async (res) => {
        const result = await this.modal.open<
          GradebookTypeOptionsModalData,
          GradebookTypeOptionsModalResult
        >({
          component: GradebookTypeOptionsModalComponent,
          data: {
            type: res.data['gradebook-type'],
            availableOptions: res.data['available-gradebook-options'] ?? [],
            selectedOptions: res.data['gradebook-type-options'] ?? [],
          },
          title: this.translate.instant('configuration.gradebook-types.configure-options'),
          description: this.translate.instant(
            'configuration.gradebook-types.options.messages.description',
          ),
          size: 'md',
          closeOnBackdrop: true,
          closeOnEscape: true,
          showCloseButton: true,
        });

        if (!result?.saved || !result.items) {
          return;
        }

        this.executeMutationRequest<GradebookTypeOptionsData>(
          this.api.put(`${route}/options/${item.id}`, {
            items: result.items,
          }),
          () => {
            this.reloadGradebookTypes();
          },
        );
      },
    );
  }

  protected onConfigureActions(): void {
  const item = this.selectedGradebookTypes()[0];

  if (!item) {
    return;
  }

  const route = this.apiRoute();

  if (!route) {
    return;
  }

  this.executeSilentRequest<GradebookTypeActionsData>(
    this.api.get(`${route}/actions/${item.id}`),
    async (res) => {
      const result = await this.modal.open<
        GradebookTypeActionsModalData,
        GradebookTypeActionsModalResult
      >({
        component: GradebookTypeActionsModalComponent,
        data: {
          type: res.data['gradebook-type'],
          availableActions: res.data['available-gradebook-actions'] ?? [],
          selectedActions: res.data['gradebook-type-actions'] ?? [],
        },
        title: this.translate.instant('configuration.gradebook-types.configure-actions'),
        description: this.translate.instant(
          'configuration.gradebook-types.actions.messages.description',
        ),
        size: 'lg',
        closeOnBackdrop: true,
        closeOnEscape: true,
        showCloseButton: true,
      });

      if (!result?.saved || !result.items) {
        return;
      }

      this.executeMutationRequest<GradebookTypeActionsData>(
        this.api.put(`${route}/actions/${item.id}`, {
          items: result.items,
        }),
        () => {
          this.reloadGradebookTypes();
        },
      );
    },
  );
}
}