import { ChangeDetectionStrategy, Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef, GetRowIdParams } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '@shared/base/base-crud';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import {
  CampusesModalComponent,
  CampusesModalData,
  CampusesModalResult,
} from '../campuses-modal/campuses-modal.component';

export interface ICampusLevel {
  id: number;
  name: string;
  description?: string | null;
}

export interface ICampus {
  id: number;
  name: string;
  description?: string | null;
  street?: string | null;
  outdoor?: string | null;
  indoor?: string | null;
  colony?: string | null;
  city?: string | null;
  state?: string | null;
  municipality?: string | null;
  zip_code?: string | null;
  css_class?: string | null;
  order: number;
  active: boolean;
  translation?: string | null;
  levels?: ICampusLevel[];
}

interface CampusesIndexData {
  campuses: ICampus[];
  catalogs?: {
    levels?: ICampusLevel[];
  };
  options?: Parameters<BaseCrud<ICampus>['setScreenOptions']>[0];
}

@Component({
  selector: 'app-campuses',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './campuses.component.html',
  styleUrl: './campuses.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampusesComponent extends BaseCrud<ICampus> implements OnInit {
  protected readonly campuses = signal<ICampus[]>([]);
  protected readonly selectedCampuses = signal<ICampus[]>([]);

  protected readonly orderingMode = signal(false);
  protected readonly savingOrder = signal(false);
  protected readonly originalCampusesOrder = signal<ICampus[]>([]);

  protected readonly catalogs = signal<{
    levels: ICampusLevel[];
  }>({
    levels: [],
  });

  protected readonly tablePagination = computed(() => !this.orderingMode());

  protected readonly hasCampuses = computed(() => this.campuses().length > 0);
  protected readonly hasSelection = computed(() => this.selectedCampuses().length > 0);
  protected readonly hasSingleSelection = computed(() => this.selectedCampuses().length === 1);

  protected readonly getRowId = (params: GetRowIdParams<ICampus>): string => {
    return String(params.data.id);
  };

  protected readonly columnDefs = computed<ColDef<ICampus>[]>(() => {
    const ordering = this.orderingMode();

    const columns: ColDef<ICampus>[] = [
      {
        field: 'name',
        headerValueGetter: () => this.translate.instant('configuration.campuses.fields.name'),
        flex: 1,
        minWidth: 180,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'description',
        headerValueGetter: () =>
          this.translate.instant('configuration.campuses.fields.description'),
        flex: 1,
        minWidth: 220,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'city',
        headerValueGetter: () => this.translate.instant('configuration.campuses.fields.city'),
        width: 180,
        minWidth: 180,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'state',
        headerValueGetter: () => this.translate.instant('configuration.campuses.fields.state'),
        width: 180,
        minWidth: 180,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'active',
        headerValueGetter: () => this.translate.instant('configuration.campuses.fields.active'),
        width: 140,
        minWidth: 140,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
        valueGetter: (params) =>
          params.data?.active
            ? this.translate.instant('common.yes')
            : this.translate.instant('common.no'),
        filterValueGetter: (params) =>
          params.data?.active
            ? this.translate.instant('common.yes')
            : this.translate.instant('common.no'),
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

  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadCampuses();
  }

  protected reloadCampuses(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest<CampusesIndexData>(this.api.get(route), (res) => {
      this.campuses.set(res.data.campuses ?? []);

      this.catalogs.set({
        levels: res.data.catalogs?.levels ?? [],
      });

      this.setScreenOptions(res.data.options);
      this.clearSelection(this.selectedCampuses);
    });
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedCampuses.set(rows as ICampus[]);
  }

  protected startOrdering(): void {
    this.originalCampusesOrder.set([...this.campuses()]);
    this.clearSelection(this.selectedCampuses);
    this.orderingMode.set(true);
  }

  protected cancelOrdering(): void {
    this.campuses.set([...this.originalCampusesOrder()]);
    this.originalCampusesOrder.set([]);
    this.orderingMode.set(false);
    this.savingOrder.set(false);
  }

  protected onRowOrderChange(rows: unknown[]): void {
    const ordered = rows as ICampus[];

    this.campuses.set(
      ordered.map((campus, index) => ({
        ...campus,
        order: index,
      })),
    );
  }

  protected saveOrder(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const payload = {
      campuses: this.campuses().map((campus, index) => ({
        id: campus.id,
        order: index,
      })),
    };

    this.savingOrder.set(true);

    this.executeSilentRequest<{ campuses: ICampus[] }>(
      this.api.put(`${route}/order`, payload),
      (res) => {
        this.handleApiSuccess(res);

        this.campuses.set(res.data.campuses ?? this.campuses());
        this.originalCampusesOrder.set([]);
        this.orderingMode.set(false);
        this.savingOrder.set(false);
        this.clearSelection(this.selectedCampuses);
      },
      () => {
        this.savingOrder.set(false);
      },
    );
  }

  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<CampusesModalData, CampusesModalResult>({
      component: CampusesModalComponent,
      data: {
        campus: null,
      },
      title: this.translate.instant('configuration.campuses.add'),
      description: this.translate.instant('configuration.campuses.messages.create-description'),
      size: 'lg',
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
      order: this.campuses().length,
    };

    this.executeMutationRequest<{ campus: ICampus }>(this.api.post(route, payload), (res) => {
      const createdCampus = res.data.campus;

      if (!createdCampus) {
        this.reloadCampuses();
        return;
      }

      this.applyCreatedItem(this.campuses, createdCampus);
      this.clearSelection(this.selectedCampuses);
    });
  }

  protected async onEdit(): Promise<void> {
    const campus = this.selectedCampuses()[0];

    if (!campus) {
      return;
    }

    const result = await this.modal.open<CampusesModalData, CampusesModalResult>({
      component: CampusesModalComponent,
      data: {
        campus,
      },
      title: this.translate.instant('configuration.campuses.update'),
      description: this.translate.instant('configuration.campuses.messages.update-description'),
      size: 'lg',
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

    this.executeMutationRequest<{ campus: ICampus }>(
      this.api.put(`${route}/${campus.id}`, result.payload),
      (res) => {
        const updatedCampus = res.data.campus;

        if (!updatedCampus) {
          this.reloadCampuses();
          return;
        }

        this.applyUpdatedItem(this.campuses, updatedCampus);
        this.selectedCampuses.set([updatedCampus]);
      },
    );
  }

  protected async onDelete(): Promise<void> {
    const campus = this.selectedCampuses()[0];

    if (!campus) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.campuses.delete',
      'configuration.campuses.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeMutationRequest<unknown>(this.api.delete(`${route}/${campus.id}`), () => {
      this.applyDeletedItem(this.campuses, campus.id);
      this.clearSelection(this.selectedCampuses);
    });
  }

  protected onLevels(campus: ICampus): void {
    console.log('Open levels assignment', campus);
  }
}
