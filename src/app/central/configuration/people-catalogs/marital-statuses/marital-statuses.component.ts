import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '../../../../shared/base/base-crud';
import { SkolansTable } from '../../../../shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { MaritalStatusesModalComponent } from '../marital-statuses-modal/marital-statuses-modal.component';

/**
 * Shape used by the marital statuses catalog table.
 */
interface MaritalStatusListItem {
  id: number;
  name: string;
  translation: string;
}

/**
 * Result returned by the marital status modal after a successful submit.
 */
interface IMaritalStatusModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string;
  };
}

/**
 * Data returned by the marital statuses index endpoint.
 */
interface MaritalStatusesIndexData {
  marital_statuses?: MaritalStatusListItem[];
  maritalStatuses?: MaritalStatusListItem[];
}

/**
 * Flexible item payload used by create/update endpoints while backend response
 * shapes are being standardized.
 */
interface MaritalStatusMutationData extends Partial<MaritalStatusListItem> {
  marital_status?: MaritalStatusListItem;
  maritalStatus?: MaritalStatusListItem;
  item?: MaritalStatusListItem;
}

/**
 * Marital Statuses Component
 * --------------------------
 * Central people catalog screen used to manage marital statuses.
 *
 * This component follows the standardized CRUD pattern implemented through
 * `BaseCrud`.
 *
 * CRUD conventions implemented here:
 * - Extends `BaseCrud` for shared API response handling, toasts, confirm-delete,
 *   and local state helpers.
 * - Uses the official API envelope `{ success, data, message }`.
 * - Logical API failures are handled through `handleApiFailure()`.
 * - Successful mutations show feedback through `handleApiSuccess()`.
 * - Create/update payloads are normalized from flexible backend responses.
 * - Delete confirmation is centralized through `confirmDelete()`.
 * - Local state updates use BaseCrud helpers instead of inline logic.
 * - The add action is always available; edit/delete are contextual in the UI.
 *
 * Responsibilities:
 * - Resolve route metadata and backend endpoint.
 * - Load marital statuses from the API.
 * - Define AG Grid columns for the catalog.
 * - Open create/edit modal flows.
 * - Persist CRUD actions through the shared API service.
 * - Keep the local table and selection state synchronized with API responses.
 */
@Component({
  selector: 'app-marital-statuses',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './marital-statuses.component.html',
  styleUrl: './marital-statuses.component.scss',
})
export class MaritalStatusesComponent extends BaseCrud<MaritalStatusListItem> implements OnInit {
  /** Marital statuses currently loaded in the grid. */
  protected readonly maritalStatuses = signal<MaritalStatusListItem[]>([]);

  /** Currently selected rows in the grid. */
  protected readonly selectedMaritalStatuses = signal<MaritalStatusListItem[]>([]);

  /** True when the screen currently has any selected record. */
  protected readonly hasSelection = computed(() => this.selectedMaritalStatuses().length > 0);

  /**
   * Validates whether an unknown backend payload can be used as a marital status row.
   */
  private isMaritalStatusListItem(value: unknown): value is MaritalStatusListItem {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<MaritalStatusListItem>;

    return (
      typeof candidate.id === 'number' &&
      typeof candidate.name === 'string' &&
      typeof candidate.translation === 'string'
    );
  }

  /**
   * AG Grid column definitions for the marital statuses catalog.
   */
  protected readonly columnDefs = computed<ColDef<MaritalStatusListItem>[]>(() => [
    {
      field: 'name',
      headerValueGetter: () => this.translate.instant('configuration.marital-statuses.fields.name'),
      flex: 1,
      minWidth: 180,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'translation',
      headerValueGetter: () => this.translate.instant('configuration.marital-statuses.fields.translation'),
      flex: 1,
      minWidth: 260,
      valueGetter: (params) => {
        const key = params.data?.translation;
        return key ? this.translate.instant(key) : '';
      },
    },
  ]);

  /**
   * Receives row selection changes from the reusable table component.
   */
  protected onSelectionChange(rows: unknown[]): void {
    this.selectedMaritalStatuses.set(rows as MaritalStatusListItem[]);
  }

  /**
   * Opens the create marital status flow.
   */
  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<null, IMaritalStatusModalResult>({
      component: MaritalStatusesModalComponent,
      data: null,
      title: this.translate.instant('configuration.marital-statuses.add'),
      description: this.translate.instant('configuration.marital-statuses.messages.create-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.request(this.api.post<MaritalStatusMutationData>(route, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const createdMaritalStatus =
          this.extractMutationItem(res.data, this.isMaritalStatusListItem, 'marital_status') ??
          this.extractMutationItem(res.data, this.isMaritalStatusListItem, 'maritalStatus') ??
          this.extractMutationItem(res.data, this.isMaritalStatusListItem, 'item') ??
          (this.isMaritalStatusListItem(res.data) ? res.data : undefined);

        if (!createdMaritalStatus) {
          this.reloadMaritalStatuses();
          return;
        }

        this.handleApiSuccess(res);
        this.applyCreatedItem(this.maritalStatuses, createdMaritalStatus);
        this.clearSelection(this.selectedMaritalStatuses);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Opens the edit marital status flow only when exactly one record is selected.
   */
  protected async onEdit(): Promise<void> {
    const selected = this.selectedMaritalStatuses();

    if (selected.length !== 1) {
      return;
    }

    const maritalStatus = selected[0];
    const route = this.apiRoute();

    if (!route || !maritalStatus.id) {
      return;
    }

    const result = await this.modal.open<MaritalStatusListItem, IMaritalStatusModalResult>({
      component: MaritalStatusesModalComponent,
      data: maritalStatus,
      title: this.translate.instant('configuration.marital-statuses.update'),
      description: this.translate.instant('configuration.marital-statuses.messages.update-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.request(this.api.put<MaritalStatusMutationData>(`${route}/${maritalStatus.id}`, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const updatedMaritalStatus =
          this.extractMutationItem(res.data, this.isMaritalStatusListItem, 'marital_status') ??
          this.extractMutationItem(res.data, this.isMaritalStatusListItem, 'maritalStatus') ??
          this.extractMutationItem(res.data, this.isMaritalStatusListItem, 'item') ??
          (this.isMaritalStatusListItem(res.data) ? res.data : undefined);

        if (!updatedMaritalStatus) {
          this.reloadMaritalStatuses();
          return;
        }

        this.handleApiSuccess(res);
        this.applyUpdatedItem(this.maritalStatuses, updatedMaritalStatus);
        this.selectedMaritalStatuses.set([updatedMaritalStatus]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Confirms and deletes the currently selected marital status.
   */
  protected async onDelete(): Promise<void> {
    const selected = this.selectedMaritalStatuses();

    if (selected.length !== 1) {
      return;
    }

    const maritalStatus = selected[0];
    const route = this.apiRoute();

    if (!route || !maritalStatus.id) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.marital-statuses.delete',
      'configuration.marital-statuses.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.request(this.api.delete<unknown>(`${route}/${maritalStatus.id}`)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);
        this.applyDeletedItem(this.maritalStatuses, maritalStatus.id);
        this.clearSelection(this.selectedMaritalStatuses);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Reloads the catalog from the backend.
   */
  protected reloadMaritalStatuses(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.request(this.api.get<MaritalStatusesIndexData | MaritalStatusListItem[]>(route)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const maritalStatuses = Array.isArray(res.data)
          ? res.data
          : res.data?.marital_statuses ?? res.data?.maritalStatuses ?? [];

        this.maritalStatuses.set(maritalStatuses);
        this.clearSelection(this.selectedMaritalStatuses);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Initializes screen metadata and performs the first catalog load.
   */
  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadMaritalStatuses();
  }
}
