import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ColDef, GetRowIdParams } from 'ag-grid-community';

import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { BaseCrud } from '@shared/base/base-crud';
import { ScreenOptionItem } from '@shared/interfaces/configuration.interfaces';
import {
  SchoolYearModalComponent,
  ISchoolYearModalResult,
} from '../school-year-modal/school-year-modal.component';

export interface ISchoolYear {
  id: number;
  name: string;
  current: boolean;
  visible: boolean;
  order: number;
  created_at?: string;
  updated_at?: string;
}

interface ISchoolYearsIndexData {
  school_years: ISchoolYear[];
  options?: ScreenOptionItem[];
}

interface ISchoolYearMutationData {
  school_year?: ISchoolYear;
  school_years?: ISchoolYear[];
  item?: ISchoolYear;
}

/**
 * School years administration component.
 *
 * Handles academic cycle catalog management.
 *
 * Responsibilities:
 * - Load school years.
 * - Create school years.
 * - Update school years.
 * - Delete school years.
 * - Reorder school years.
 *
 * Business rules:
 * - Only one school year can be current.
 * - Backend guarantees current-year uniqueness.
 * - Backend normalizes order after delete.
 */
@Component({
  selector: 'app-school-years',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './school-years.component.html',
  styleUrl: './school-years.component.scss',
})
export class SchoolYearsComponent extends BaseCrud<ISchoolYear> implements OnInit {
  protected readonly schoolYears = signal<ISchoolYear[]>([]);
  protected readonly selectedSchoolYears = signal<ISchoolYear[]>([]);

  protected readonly selectedSchoolYear = computed(() => this.selectedSchoolYears()[0] ?? null);
  protected readonly hasSelection = computed(() => this.selectedSchoolYears().length > 0);
  protected readonly hasSingleSelection = computed(() => this.selectedSchoolYears().length === 1);

  protected readonly orderingMode = signal(false);
  protected readonly savingOrder = signal(false);

  protected readonly tablePagination = computed(() => !this.orderingMode());

  private setSchoolYearsFromResponse(schoolYears: ISchoolYear[] | undefined): void {
    this.schoolYears.set([...(schoolYears ?? [])].sort((a, b) => a.order - b.order));
  }

  protected readonly columnDefs = computed<ColDef<ISchoolYear>[]>(() => {
    const ordering = this.orderingMode();

    const columns: ColDef<ISchoolYear>[] = [
      {
        field: 'name',
        headerValueGetter: () => this.translate.instant('administration.school-years.fields.name'),
        flex: 1,
        minWidth: 180,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'current',
        headerValueGetter: () =>
          this.translate.instant('administration.school-years.fields.current'),
        width: 140,
        sortable: !ordering,
        filter: false,
        floatingFilter: false,
        valueGetter: (params) =>
          params.data?.current
            ? this.translate.instant('common.yes')
            : this.translate.instant('common.no'),
      },
      {
        field: 'visible',
        headerValueGetter: () =>
          this.translate.instant('administration.school-years.fields.visible'),
        width: 140,
        sortable: !ordering,
        filter: false,
        floatingFilter: false,
        valueGetter: (params) =>
          params.data?.visible
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

  protected isSchoolYear(value: unknown): value is ISchoolYear {
    const item = value as ISchoolYear;

    return (
      !!item &&
      typeof item.id === 'number' &&
      typeof item.name === 'string' &&
      typeof item.current === 'boolean' &&
      typeof item.visible === 'boolean'
    );
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedSchoolYears.set(rows as ISchoolYear[]);
  }

  protected reloadSchoolYears(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest(this.api.get<ISchoolYearsIndexData>(route), (res) => {
      this.setScreenOptions(res.data.options);
      this.schoolYears.set(res.data.school_years ?? []);
      this.clearSelection(this.selectedSchoolYears);
    });
  }

  protected async createSchoolYear(): Promise<void> {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const result = await this.modal.open<Partial<ISchoolYear>, ISchoolYearModalResult>({
      component: SchoolYearModalComponent,
      data: {
        visible: true,
        current: false,
        order: this.schoolYears().length + 1,
      },
      title: this.translate.instant('administration.school-years.add'),
      description: this.translate.instant(
        'administration.school-years.messages.create-description',
      ),
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.executeMutationRequest(
      this.api.post<ISchoolYearMutationData>(route, result.payload),
      (res) => {
        if (Array.isArray(res.data?.school_years)) {
          this.setSchoolYearsFromResponse(res.data.school_years);
          this.clearSelection(this.selectedSchoolYears);
          return;
        }

        this.reloadSchoolYears();
      },
    );
  }

  protected async updateSchoolYear(): Promise<void> {
    const route = this.apiRoute();
    const schoolYear = this.selectedSchoolYear();

    if (!route || !schoolYear) {
      return;
    }

    const result = await this.modal.open<ISchoolYear, ISchoolYearModalResult>({
      component: SchoolYearModalComponent,
      data: schoolYear,
      title: this.translate.instant('administration.school-years.update'),
      description: this.translate.instant(
        'administration.school-years.messages.update-description',
      ),
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.executeMutationRequest(
      this.api.put<ISchoolYearMutationData>(`${route}/${schoolYear.id}`, result.payload),
      (res) => {
        if (Array.isArray(res.data?.school_years)) {
          this.setSchoolYearsFromResponse(res.data.school_years);

          const updatedSchoolYear = res.data.school_years.find((item) => item.id === schoolYear.id);

          this.selectedSchoolYears.set(updatedSchoolYear ? [updatedSchoolYear] : []);
          return;
        }

        this.reloadSchoolYears();
      },
    );
  }

  protected async deleteSchoolYear(): Promise<void> {
    const route = this.apiRoute();
    const schoolYear = this.selectedSchoolYear();

    if (!route || !schoolYear) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'administration.school-years.messages.delete-title',
      'administration.school-years.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.executeMutationRequest(
      this.api.delete<ISchoolYearMutationData>(`${route}/${schoolYear.id}`),
      (res) => {
        if (Array.isArray(res.data?.school_years)) {
          this.schoolYears.set(res.data.school_years);
          this.clearSelection(this.selectedSchoolYears);
          return;
        }

        this.reloadSchoolYears();
      },
    );
  }

  protected reorderSchoolYears(items: ISchoolYear[]): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const payload = {
      items: items.map((item, index) => ({
        id: item.id,
        order: index + 1,
      })),
    };

    this.executeMutationRequest(
      this.api.put<ISchoolYearMutationData>(`${route}/reorder`, payload),
      (res) => {
        if (Array.isArray(res.data?.school_years)) {
          this.schoolYears.set(res.data.school_years);
          this.clearSelection(this.selectedSchoolYears);
          return;
        }

        this.reloadSchoolYears();
      },
    );
  }

  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadSchoolYears();
  }

  protected readonly getRowId = (params: GetRowIdParams<ISchoolYear>): string => {
    return String(params.data.id);
  };

  protected startOrdering(): void {
    this.orderingMode.set(true);
    this.clearSelection(this.selectedSchoolYears);
  }

  protected cancelOrdering(): void {
    this.orderingMode.set(false);
    this.clearSelection(this.selectedSchoolYears);
    this.reloadSchoolYears();
  }

  protected onRowOrderChange(rows: unknown[]): void {
    this.schoolYears.set(rows as ISchoolYear[]);
  }

  protected saveOrder(): void {
    const route = this.apiRoute();

    if (!route || this.savingOrder()) {
      return;
    }

    const payload = {
      items: this.schoolYears().map((item, index) => ({
        id: item.id,
        order: index + 1,
      })),
    };

    this.savingOrder.set(true);

    this.request(this.api.put<ISchoolYearMutationData>(`${route}/reorder`, payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);

        if (Array.isArray(res.data?.school_years)) {
          this.schoolYears.set([...res.data.school_years].sort((a, b) => a.order - b.order));
        } else {
          this.reloadSchoolYears();
        }

        this.orderingMode.set(false);
        this.clearSelection(this.selectedSchoolYears);
      },
      error: () => this.ignoreHandledRequestError(),
      complete: () => {
        this.savingOrder.set(false);
      },
    });
  }
}
