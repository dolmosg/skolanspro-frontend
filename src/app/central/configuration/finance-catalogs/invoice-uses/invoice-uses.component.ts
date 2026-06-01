import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '../../../../shared/base/base-crud';
import { SkolansTable } from '../../../../shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { InvoiceUsesModalComponent } from '../invoice-uses-modal/invoice-uses-modal.component';
import { InvoiceUsesTinTypesModalComponent } from '../invoice-uses-tin-types-modal/invoice-uses-tin-types-modal.component';

/**
 * Shape used by the invoice uses catalog table.
 */
interface InvoiceUseListItem {
  id: number;
  code: string;
  name: string;
  tin_types?: InvoiceUseTinTypeOption[];
}

/**
 * TIN type option used by the invoice use relation modal.
 */
interface InvoiceUseTinTypeOption {
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
 * Result returned by the invoice use modal after a successful submit.
 */
interface IInvoiceUseModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    code: string;
    name: string;
  };
}

/**
 * Result returned by the invoice use / TIN types relation modal.
 */
interface IInvoiceUseTinTypesModalResult {
  saved: boolean;
  payload: {
    tin_type_ids: number[];
  };
}

/**
 * Data returned by the invoice uses index endpoint.
 */
interface InvoiceUsesIndexData {
  invoice_uses?: InvoiceUseListItem[];
  invoiceUses?: InvoiceUseListItem[];
  tin_types?: InvoiceUseTinTypeOption[];
  tinTypes?: InvoiceUseTinTypeOption[];
}

/**
 * Flexible item payload used by create/update endpoints while the backend
 * response shape is being standardized.
 */
interface InvoiceUseMutationData extends Partial<InvoiceUseListItem> {
  invoice_use?: InvoiceUseListItem;
  invoiceUse?: InvoiceUseListItem;
  item?: InvoiceUseListItem;
}

/**
 * Invoice Uses Component
 * ----------------------
 * Central finance catalog screen used to manage CFDI invoice uses.
 *
 * This component follows the standardized CRUD pattern implemented through
 * `BaseCrud`, with one additional relation flow for synchronizing valid TIN
 * types per invoice use.
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
 * - The add action is hidden while a record is selected; edit/delete/TIN types
 *   are contextual in the UI.
 *
 * Responsibilities:
 * - Resolve route metadata and backend endpoint.
 * - Load invoice uses and available TIN type selector options from the API.
 * - Define AG Grid columns for the catalog.
 * - Open create/edit modal flows.
 * - Open the TIN type relation modal flow.
 * - Persist CRUD and relation actions through the shared API service.
 * - Keep the local table and selection state synchronized with API responses.
 */
@Component({
  selector: 'app-invoice-uses',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './invoice-uses.component.html',
  styleUrl: './invoice-uses.component.scss',
})
export class InvoiceUsesComponent extends BaseCrud<InvoiceUseListItem> implements OnInit {

  /** Invoice uses currently loaded in the grid. */
  protected readonly invoiceUses = signal<InvoiceUseListItem[]>([]);

  /** TIN types available to relate with invoice uses. */
  protected readonly tinTypes = signal<InvoiceUseTinTypeOption[]>([]);

  /** Currently selected rows in the grid. */
  protected readonly selectedInvoiceUses = signal<InvoiceUseListItem[]>([]);

  /** True when the screen currently has any selected record. */
  protected readonly hasSelection = computed(() => this.selectedInvoiceUses().length > 0);

  /**
   * AG Grid column definitions for the invoice uses catalog.
   */
  protected readonly columnDefs = computed<ColDef<InvoiceUseListItem>[]>(() => [
    {
      field: 'code',
      headerValueGetter: () => this.translate.instant('configuration.invoice-uses.fields.code'),
      flex: 0.5,
      minWidth: 120,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'name',
      headerValueGetter: () => this.translate.instant('configuration.invoice-uses.fields.name'),
      flex: 1.5,
      minWidth: 260,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
  ]);

  /**
   * Validates whether an unknown backend payload can be used as an invoice use row.
   */
  private isInvoiceUseListItem(value: unknown): value is InvoiceUseListItem {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<InvoiceUseListItem>;

    return (
      typeof candidate.id === 'number' &&
      typeof candidate.code === 'string' &&
      typeof candidate.name === 'string'
    );
  }

  /**
   * Extracts a valid invoice use item from flexible mutation endpoint payloads.
   */
  private extractInvoiceUseFromMutationData(data: InvoiceUseMutationData | null | undefined): InvoiceUseListItem | null {
    return (
      this.extractMutationItem(data, this.isInvoiceUseListItem, 'invoice_use') ??
      this.extractMutationItem(data, this.isInvoiceUseListItem, 'invoiceUse') ??
      this.extractMutationItem(data, this.isInvoiceUseListItem, 'item') ??
      (this.isInvoiceUseListItem(data) ? data : null)
    );
  }

  /**
   * Receives row selection changes from the reusable table component.
   */
  protected onSelectionChange(rows: unknown[]): void {
    this.selectedInvoiceUses.set(rows as InvoiceUseListItem[]);
  }

  /**
   * Opens the create invoice use flow.
   */
  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<null, IInvoiceUseModalResult>({
      component: InvoiceUsesModalComponent,
      data: null,
      title: this.translate.instant('configuration.invoice-uses.add'),
      description: this.translate.instant('configuration.invoice-uses.messages.create-description'),
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

    this.request(this.api.post<InvoiceUseMutationData>(route, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const createdInvoiceUse = this.extractInvoiceUseFromMutationData(res.data);

        if (!createdInvoiceUse) {
          this.reloadInvoiceUses();
          return;
        }

        this.handleApiSuccess(res);
        this.applyCreatedItem(this.invoiceUses, createdInvoiceUse);
        this.clearSelection(this.selectedInvoiceUses);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Opens the edit invoice use flow only when exactly one record is selected.
   */
  protected async onEdit(): Promise<void> {
    const selected = this.selectedInvoiceUses();

    if (selected.length !== 1) {
      return;
    }

    const invoiceUse = selected[0];
    const route = this.apiRoute();

    if (!route || !invoiceUse.id) {
      return;
    }

    const result = await this.modal.open<InvoiceUseListItem, IInvoiceUseModalResult>({
      component: InvoiceUsesModalComponent,
      data: invoiceUse,
      title: this.translate.instant('configuration.invoice-uses.update'),
      description: this.translate.instant('configuration.invoice-uses.messages.update-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.request(this.api.put<InvoiceUseMutationData>(`${route}/${invoiceUse.id}`, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const responseInvoiceUse = this.extractInvoiceUseFromMutationData(res.data);

        const updatedInvoiceUse: InvoiceUseListItem = {
          ...invoiceUse,
          ...result.payload,
          ...(responseInvoiceUse ?? {}),
          id: invoiceUse.id,
        };

        this.handleApiSuccess(res);
        this.applyUpdatedItem(this.invoiceUses, updatedInvoiceUse);
        this.selectedInvoiceUses.set([updatedInvoiceUse]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Confirms and deletes the currently selected invoice use.
   */
  protected async onDelete(): Promise<void> {
    const selected = this.selectedInvoiceUses();

    if (selected.length !== 1) {
      return;
    }

    const invoiceUse = selected[0];
    const route = this.apiRoute();

    if (!route || !invoiceUse.id) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.invoice-uses.delete',
      'configuration.invoice-uses.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.request(this.api.delete<unknown>(`${route}/${invoiceUse.id}`)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);
        this.applyDeletedItem(this.invoiceUses, invoiceUse.id);
        this.clearSelection(this.selectedInvoiceUses);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Opens the relation flow between the selected invoice use and available TIN types.
   */
  protected async onTinTypes(): Promise<void> {
    const selected = this.selectedInvoiceUses();

    if (selected.length !== 1) {
      return;
    }

    const invoiceUse = selected[0];
    const route = this.apiRoute();

    if (!route || !invoiceUse.id) {
      return;
    }

    const tinTypes = this.tinTypes();

    if (!tinTypes || tinTypes.length === 0) {
      console.warn('[InvoiceUses] No tinTypes available');
      return;
    }

    const selectedTinTypeIds = invoiceUse.tin_types?.map((tinType) => tinType.id) ?? [];

    const result = await this.modal.open<
      {
        invoiceUse: InvoiceUseListItem;
        tinTypes: InvoiceUseTinTypeOption[];
        selectedTinTypeIds: number[];
      },
      IInvoiceUseTinTypesModalResult
    >({
      component: InvoiceUsesTinTypesModalComponent,
      data: {
        invoiceUse,
        tinTypes,
        selectedTinTypeIds,
      },
      title: this.translate.instant('configuration.invoice-uses.tin-types'),
      description: this.translate.instant('configuration.invoice-uses.messages.tin-types-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.request(this.api.put<InvoiceUseListItem | null>(`${route}/${invoiceUse.id}/sync-tin-types`, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const syncedInvoiceUse = res.data ?? null;
        const syncedTinTypeIds =
          syncedInvoiceUse?.tin_types?.map((tinType: { id: number }) => tinType.id) ?? result.payload.tin_type_ids;

        const updatedInvoiceUse: InvoiceUseListItem = {
          ...invoiceUse,
          ...(syncedInvoiceUse ?? {}),
          tin_types: this.tinTypes().filter((tinType) => syncedTinTypeIds.includes(tinType.id)),
        };

        this.handleApiSuccess(res);
        this.applyUpdatedItem(this.invoiceUses, updatedInvoiceUse);
        this.selectedInvoiceUses.set([updatedInvoiceUse]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Reloads the catalog from the backend.
   */
  protected reloadInvoiceUses(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.request(this.api.get<InvoiceUsesIndexData | InvoiceUseListItem[]>(route)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const invoiceUses = Array.isArray(res.data)
          ? res.data
          : res.data?.invoice_uses ?? res.data?.invoiceUses ?? [];

        const tinTypes = Array.isArray(res.data)
          ? []
          : res.data?.tin_types ?? res.data?.tinTypes ?? [];

        this.invoiceUses.set(invoiceUses);
        this.tinTypes.set(tinTypes);
        this.clearSelection(this.selectedInvoiceUses);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Initializes screen metadata and performs the first catalog load.
   */
  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadInvoiceUses();
  }
}
