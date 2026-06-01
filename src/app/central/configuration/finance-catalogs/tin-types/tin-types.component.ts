import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '../../../../shared/base/base-crud';
import { SkolansTable } from '../../../../shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { TinTypesModalComponent } from '../tin-types-modal/tin-types-modal.component';

/**
 * Shape used by the TIN types catalog table.
 */
interface TinTypeListItem {
  id: number;
  name: string;
  translation: string;
  validation?: string | null;
  country_id: number;
  country?: TinTypeCountryOption | null;
}

/**
 * Country option used by the TIN type modal selector.
 */
interface TinTypeCountryOption {
  id: number;
  name: string;
  iso_code: string;
  phone_code: string;
}

/**
 * Result returned by the TIN type modal after a successful submit.
 */
interface ITinTypeModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string;
    validation: string | null;
    country_id: number;
  };
}

/**
 * Data returned by the TIN types index endpoint.
 */
interface TinTypesIndexData {
  tin_types?: TinTypeListItem[];
  tinTypes?: TinTypeListItem[];
  countries?: TinTypeCountryOption[];
}

/**
 * Flexible item payload used by create/update endpoints while backend response
 * shapes are being standardized.
 */
interface TinTypeMutationData extends Partial<TinTypeListItem> {
  tin_type?: TinTypeListItem;
  tinType?: TinTypeListItem;
  item?: TinTypeListItem;
}

/**
 * TIN Types Component
 * -------------------
 * Central finance catalog screen used to manage tax identification number types.
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
 * - Load TIN types and country selector options from the API.
 * - Define AG Grid columns for the catalog.
 * - Open create/edit modal flows.
 * - Persist CRUD actions through the shared API service.
 * - Keep the local table and selection state synchronized with API responses.
 */
@Component({
  selector: 'app-tin-types',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './tin-types.component.html',
  styleUrl: './tin-types.component.scss',
})
export class TinTypesComponent extends BaseCrud<TinTypeListItem> implements OnInit {
  /** TIN types currently loaded in the grid. */
  protected readonly tinTypes = signal<TinTypeListItem[]>([]);

  /** Countries used by the TIN type modal selector. */
  protected readonly countries = signal<TinTypeCountryOption[]>([]);

  /** Currently selected rows in the grid. */
  protected readonly selectedTinTypes = signal<TinTypeListItem[]>([]);

  /** True when the screen currently has any selected record. */
  protected readonly hasSelection = computed(() => this.selectedTinTypes().length > 0);

  /**
   * Validates whether an unknown backend payload can be used as a TIN type row.
   */
  private isTinTypeListItem(value: unknown): value is TinTypeListItem {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<TinTypeListItem>;

    return (
      typeof candidate.id === 'number' &&
      typeof candidate.name === 'string' &&
      typeof candidate.translation === 'string' &&
      typeof candidate.country_id === 'number'
    );
  }

  /**
   * AG Grid column definitions for the TIN types catalog.
   */
  protected readonly columnDefs = computed<ColDef<TinTypeListItem>[]>(() => [
    {
      field: 'name',
      headerValueGetter: () => this.translate.instant('configuration.tin-types.fields.name'),
      flex: 1,
      minWidth: 180,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'translation',
      headerValueGetter: () => this.translate.instant('configuration.tin-types.fields.translation'),
      flex: 1.25,
      minWidth: 260,
      valueGetter: (params) => {
        const key = params.data?.translation;
        return key ? this.translate.instant(key) : '';
      },
    },
    {
      field: 'validation',
      headerValueGetter: () => this.translate.instant('configuration.tin-types.fields.validation'),
      flex: 1.25,
      minWidth: 260,
      sortable: true,
    },
    {
      field: 'country_id',
      headerValueGetter: () => this.translate.instant('configuration.tin-types.fields.country'),
      flex: 1,
      minWidth: 200,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
      valueGetter: (params) => {
        const country = params.data?.country;

        if (country?.name) {
          return `${country.name} (${country.iso_code})`;
        }

        const countryId = params.data?.country_id;
        const match = this.countries().find((item) => item.id === countryId);

        return match ? `${match.name} (${match.iso_code})` : '';
      },
    },
  ]);

  /**
   * Receives row selection changes from the reusable table component.
   */
  protected onSelectionChange(rows: unknown[]): void {
    this.selectedTinTypes.set(rows as TinTypeListItem[]);
  }

  /**
   * Opens the create TIN type flow.
   */
  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<Partial<TinTypeListItem> & { countries: TinTypeCountryOption[] }, ITinTypeModalResult>({
      component: TinTypesModalComponent,
      data: {
        countries: this.countries(),
      },
      title: this.translate.instant('configuration.tin-types.add'),
      description: this.translate.instant('configuration.tin-types.messages.create-description'),
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

    this.request(this.api.post<TinTypeMutationData>(route, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const createdTinType =
          this.extractMutationItem(res.data, this.isTinTypeListItem, 'tin_type') ??
          this.extractMutationItem(res.data, this.isTinTypeListItem, 'tinType') ??
          this.extractMutationItem(res.data, this.isTinTypeListItem, 'item') ??
          (this.isTinTypeListItem(res.data) ? res.data : undefined);

        if (!createdTinType) {
          this.reloadTinTypes();
          return;
        }

        this.handleApiSuccess(res);
        this.applyCreatedItem(this.tinTypes, createdTinType);
        this.clearSelection(this.selectedTinTypes);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Opens the edit TIN type flow only when exactly one record is selected.
   */
  protected async onEdit(): Promise<void> {
    const selected = this.selectedTinTypes();

    if (selected.length !== 1) {
      return;
    }

    const tinType = selected[0];
    const route = this.apiRoute();

    if (!route || !tinType.id) {
      return;
    }

    const result = await this.modal.open<TinTypeListItem & { countries: TinTypeCountryOption[] }, ITinTypeModalResult>({
      component: TinTypesModalComponent,
      data: {
        ...tinType,
        countries: this.countries(),
      },
      title: this.translate.instant('configuration.tin-types.update'),
      description: this.translate.instant('configuration.tin-types.messages.update-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.request(this.api.put<TinTypeMutationData>(`${route}/${tinType.id}`, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const updatedTinType =
          this.extractMutationItem(res.data, this.isTinTypeListItem, 'tin_type') ??
          this.extractMutationItem(res.data, this.isTinTypeListItem, 'tinType') ??
          this.extractMutationItem(res.data, this.isTinTypeListItem, 'item') ??
          (this.isTinTypeListItem(res.data) ? res.data : undefined);

        if (!updatedTinType) {
          this.reloadTinTypes();
          return;
        }

        this.handleApiSuccess(res);
        this.applyUpdatedItem(this.tinTypes, updatedTinType);
        this.selectedTinTypes.set([updatedTinType]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Confirms and deletes the currently selected TIN type.
   */
  protected async onDelete(): Promise<void> {
    const selected = this.selectedTinTypes();

    if (selected.length !== 1) {
      return;
    }

    const tinType = selected[0];
    const route = this.apiRoute();

    if (!route || !tinType.id) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.tin-types.delete',
      'configuration.tin-types.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.request(this.api.delete<unknown>(`${route}/${tinType.id}`)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);
        this.applyDeletedItem(this.tinTypes, tinType.id);
        this.clearSelection(this.selectedTinTypes);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Reloads the catalog from the backend.
   */
  protected reloadTinTypes(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.request(this.api.get<TinTypesIndexData | TinTypeListItem[]>(route)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const tinTypes = Array.isArray(res.data)
          ? res.data
          : res.data?.tin_types ?? res.data?.tinTypes ?? [];

        const countries = Array.isArray(res.data)
          ? []
          : res.data?.countries ?? [];

        this.tinTypes.set(tinTypes);
        this.countries.set(countries);
        this.clearSelection(this.selectedTinTypes);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Initializes screen metadata and performs the first catalog load.
   */
  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadTinTypes();
  }
}
