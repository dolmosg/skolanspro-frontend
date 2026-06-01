import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '../../../../shared/base/base-crud';
import { SkolansTable } from '../../../../shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { TaxRegimesModalComponent } from '../tax-regimes-modal/tax-regimes-modal.component';
import {
  ITaxRegimeTinTypesModalResult,
  TaxRegimesTinTypesModalComponent,
} from '../tax-regimes-tin-types-modal/tax-regimes-tin-types-modal.component';

/**
 * Shape used by the tax regimes catalog table.
 */
interface TaxRegimeListItem {
  id: number;
  code: string;
  name: string;
  tin_types?: TaxRegimeTinTypeOption[];
}

/**
 * TIN type option used by the tax regime relation modal.
 */
interface TaxRegimeTinTypeOption {
  id: number;
  name: string;
  translation: string;
  validation?: string | null;
  country_id: number;
  country?: {
    id: number;
    name: string;
    iso_code: string;
    phone_code: string;
  } | null;
}

/**
 * Result returned by the tax regime modal after a successful submit.
 */
interface ITaxRegimeModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    code: string;
    name: string;
  };
}

/**
 * Data returned by the tax regimes index endpoint.
 */
interface TaxRegimesIndexData {
  tax_regimes?: TaxRegimeListItem[];
  taxRegimes?: TaxRegimeListItem[];
  tin_types?: TaxRegimeTinTypeOption[];
  tinTypes?: TaxRegimeTinTypeOption[];
}

/**
 * Flexible item payload used by create/update endpoints while backend response
 * shapes are being standardized.
 */
interface TaxRegimeMutationData extends Partial<TaxRegimeListItem> {
  tax_regime?: TaxRegimeListItem;
  taxRegime?: TaxRegimeListItem;
  item?: TaxRegimeListItem;
}

/**
 * Tax Regimes Component
 * ---------------------
 * Central finance catalog screen used to manage tax regimes.
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
 * - The add action is hidden while a record is selected; edit/delete are
 *   contextual in the UI.
 *
 * Responsibilities:
 * - Resolve route metadata and backend endpoint.
 * - Load tax regimes from the API.
 * - Define AG Grid columns for the catalog.
 * - Open create/edit modal flows.
 * - Persist CRUD actions through the shared API service.
 * - Keep the local table and selection state synchronized with API responses.
 */
@Component({
  selector: 'app-tax-regimes',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './tax-regimes.component.html',
  styleUrl: './tax-regimes.component.scss',
})
export class TaxRegimesComponent extends BaseCrud<TaxRegimeListItem> implements OnInit {
  /** Tax regimes currently loaded in the grid. */
  protected readonly taxRegimes = signal<TaxRegimeListItem[]>([]);

  /** TIN types available for relation assignment. */
  protected readonly tinTypes = signal<TaxRegimeTinTypeOption[]>([]);

  /** Currently selected rows in the grid. */
  protected readonly selectedTaxRegimes = signal<TaxRegimeListItem[]>([]);

  /** True when the screen currently has any selected record. */
  protected readonly hasSelection = computed(() => this.selectedTaxRegimes().length > 0);

  /**
   * Validates whether an unknown backend payload can be used as a tax regime row.
   */
  private isTaxRegimeListItem(value: unknown): value is TaxRegimeListItem {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<TaxRegimeListItem>;

    return (
      typeof candidate.id === 'number' &&
      typeof candidate.code === 'string' &&
      typeof candidate.name === 'string'
    );
  }

  /**
   * AG Grid column definitions for the tax regimes catalog.
   */
  protected readonly columnDefs = computed<ColDef<TaxRegimeListItem>[]>(() => [
    {
      field: 'code',
      headerValueGetter: () => this.translate.instant('configuration.tax-regimes.fields.code'),
      flex: 0.5,
      minWidth: 120,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'name',
      headerValueGetter: () => this.translate.instant('configuration.tax-regimes.fields.name'),
      flex: 1.5,
      minWidth: 260,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
  ]);

  /**
   * Receives row selection changes from the reusable table component.
   */
  protected onSelectionChange(rows: unknown[]): void {
    this.selectedTaxRegimes.set(rows as TaxRegimeListItem[]);
  }

  /**
   * Opens the create tax regime flow.
   */
  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<null, ITaxRegimeModalResult>({
      component: TaxRegimesModalComponent,
      data: null,
      title: this.translate.instant('configuration.tax-regimes.add'),
      description: this.translate.instant('configuration.tax-regimes.messages.create-description'),
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

    this.request(this.api.post<TaxRegimeMutationData>(route, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const createdTaxRegime =
          this.extractMutationItem(res.data, this.isTaxRegimeListItem, 'tax_regime') ??
          this.extractMutationItem(res.data, this.isTaxRegimeListItem, 'taxRegime') ??
          this.extractMutationItem(res.data, this.isTaxRegimeListItem, 'item') ??
          (this.isTaxRegimeListItem(res.data) ? res.data : undefined);

        if (!createdTaxRegime) {
          this.reloadTaxRegimes();
          return;
        }

        this.handleApiSuccess(res);
        this.applyCreatedItem(this.taxRegimes, createdTaxRegime);
        this.clearSelection(this.selectedTaxRegimes);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Opens the edit tax regime flow only when exactly one record is selected.
   */
  protected async onEdit(): Promise<void> {
    const selected = this.selectedTaxRegimes();

    if (selected.length !== 1) {
      return;
    }

    const taxRegime = selected[0];
    const route = this.apiRoute();

    if (!route || !taxRegime.id) {
      return;
    }

    const result = await this.modal.open<TaxRegimeListItem, ITaxRegimeModalResult>({
      component: TaxRegimesModalComponent,
      data: taxRegime,
      title: this.translate.instant('configuration.tax-regimes.update'),
      description: this.translate.instant('configuration.tax-regimes.messages.update-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.request(this.api.put<TaxRegimeMutationData>(`${route}/${taxRegime.id}`, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const updatedTaxRegime =
          this.extractMutationItem(res.data, this.isTaxRegimeListItem, 'tax_regime') ??
          this.extractMutationItem(res.data, this.isTaxRegimeListItem, 'taxRegime') ??
          this.extractMutationItem(res.data, this.isTaxRegimeListItem, 'item') ??
          (this.isTaxRegimeListItem(res.data) ? res.data : undefined);

        if (!updatedTaxRegime) {
          this.reloadTaxRegimes();
          return;
        }

        this.handleApiSuccess(res);
        this.applyUpdatedItem(this.taxRegimes, updatedTaxRegime);
        this.selectedTaxRegimes.set([updatedTaxRegime]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Confirms and deletes the currently selected tax regime.
   */
  protected async onDelete(): Promise<void> {
    const selected = this.selectedTaxRegimes();

    if (selected.length !== 1) {
      return;
    }

    const taxRegime = selected[0];
    const route = this.apiRoute();

    if (!route || !taxRegime.id) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.tax-regimes.delete',
      'configuration.tax-regimes.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.request(this.api.delete<unknown>(`${route}/${taxRegime.id}`)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);
        this.applyDeletedItem(this.taxRegimes, taxRegime.id);
        this.clearSelection(this.selectedTaxRegimes);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Opens the relation flow used to synchronize valid TIN types for the selected tax regime.
   */
  protected async onTinTypes(): Promise<void> {
    const selected = this.selectedTaxRegimes();

    if (selected.length !== 1) {
      return;
    }

    const taxRegime = selected[0];
    const route = this.apiRoute();

    if (!route || !taxRegime.id) {
      return;
    }

    const result = await this.modal.open<
      {
        taxRegime: TaxRegimeListItem;
        tinTypes: TaxRegimeTinTypeOption[];
        selectedTinTypeIds: number[];
      },
      ITaxRegimeTinTypesModalResult
    >({
      component: TaxRegimesTinTypesModalComponent,
      data: {
        taxRegime,
        tinTypes: this.tinTypes(),
        selectedTinTypeIds: taxRegime.tin_types?.map((tinType) => tinType.id) ?? [],
      },
      title: this.translate.instant('configuration.tax-regimes.tin-types'),
      description: this.translate.instant('configuration.tax-regimes.messages.tin-types-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.request(this.api.put<TaxRegimeListItem | null>(`${route}/${taxRegime.id}/sync-tin-types`, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const syncedTaxRegime = res.data ?? null;
        const syncedTinTypeIds =
          syncedTaxRegime?.tin_types?.map((tinType: { id: number }) => tinType.id) ?? result.payload.tin_type_ids;

        const updatedTaxRegime: TaxRegimeListItem = {
          ...taxRegime,
          ...(syncedTaxRegime ?? {}),
          tin_types: this.tinTypes().filter((tinType) => syncedTinTypeIds.includes(tinType.id)),
        };

        this.handleApiSuccess(res);
        this.applyUpdatedItem(this.taxRegimes, updatedTaxRegime);
        this.selectedTaxRegimes.set([updatedTaxRegime]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Reloads the catalog from the backend.
   */
  protected reloadTaxRegimes(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.request(this.api.get<TaxRegimesIndexData | TaxRegimeListItem[]>(route)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const taxRegimes = Array.isArray(res.data)
          ? res.data
          : res.data?.tax_regimes ?? res.data?.taxRegimes ?? [];
        const tinTypes = Array.isArray(res.data)
          ? []
          : res.data?.tin_types ?? res.data?.tinTypes ?? [];

        this.taxRegimes.set(taxRegimes);
        this.tinTypes.set(tinTypes);
        this.clearSelection(this.selectedTaxRegimes);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Initializes screen metadata and performs the first catalog load.
   */
  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadTaxRegimes();
  }
}
