import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '../../../../shared/base/base-crud';
import { SkolansTable } from '../../../../shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { CountriesModalComponent } from '../countries-modal/countries-modal.component';

/**
 * Shape used by the countries catalog table.
 */
interface CountryListItem {
  id: number;
  name: string;
  phone_code: string;
  iso_code: string;
  language: string;
}

/**
 * Language option used by the country modal selector.
 */
interface CountryLanguageOption {
  code: string;
  label: string;
}

/**
 * Result returned by the country modal after a successful submit.
 */
interface ICountryModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    phone_code: string;
    iso_code: string;
    language: string;
  };
}

/**
 * Data returned by the countries index endpoint.
 */
interface CountriesIndexData {
  countries?: CountryListItem[];
  languages?: CountryLanguageOption[];
}

/**
 * Flexible item payload used by create/update endpoints while backend response
 * shapes are being standardized.
 */
interface CountryMutationData extends Partial<CountryListItem> {
  country?: CountryListItem;
  item?: CountryListItem;
}

/**
 * Countries Component
 * -------------------
 * Central localization catalog screen used to manage countries.
 *
 * This component is the reference implementation for the current catalog CRUD
 * pattern in SkolansPro.
 *
 * Base architecture:
 * - Extends `BaseCrud` for reusable catalog helpers.
 * - Inherits request execution helpers from `SkolansBaseComponent`.
 * - Uses `executeSilentRequest()` for load/reload operations.
 * - Uses `executeMutationRequest()` for create, update, and delete operations.
 * - Uses the official API envelope `{ success, data, message }`.
 * - Logical API failures (`success:false`) are handled centrally by
 *   `handleApiFailure()` through the execution helpers.
 * - HTTP/transport errors are handled globally by `ApiService` and consumed by
 *   `ignoreHandledRequestError()`.
 * - Successful mutations automatically show feedback through
 *   `handleApiSuccess()` via `executeMutationRequest()`.
 *
 * CRUD conventions implemented here:
 * - Create/update payloads are normalized from flexible backend responses.
 * - Delete confirmation is centralized through `confirmDelete()`.
 * - Local state updates use `BaseCrud` helpers instead of inline array logic.
 * - The add action is always available; edit/delete remain contextual in the UI.
 * - Reload operations do not show success toasts.
 *
 * Responsibilities:
 * - Resolve route metadata and backend endpoint.
 * - Load countries and language selector options from the API.
 * - Define AG Grid columns for the catalog.
 * - Open create/edit modal flows.
 * - Persist CRUD actions through the shared API service.
 * - Keep the local table and selection state synchronized with API responses.
 */
@Component({
  selector: 'app-countries',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './countries.component.html',
  styleUrl: './countries.component.scss',
})
export class CountriesComponent extends BaseCrud<CountryListItem> implements OnInit {

  /** Countries currently loaded in the grid. */
  protected readonly countries = signal<CountryListItem[]>([]);

  /** Languages used by the country modal selector. */
  protected readonly languages = signal<CountryLanguageOption[]>([]);

  /** Currently selected rows in the grid. */
  protected readonly selectedCountries = signal<CountryListItem[]>([]);

  /** True when the screen currently has any selected record. */
  protected readonly hasSelection = computed(() => this.selectedCountries().length > 0);

  /**
   * Validates whether an unknown backend payload can be used as a country row.
   */
  private isCountryListItem(value: unknown): value is CountryListItem {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<CountryListItem>;

    return (
      typeof candidate.id === 'number' &&
      typeof candidate.name === 'string' &&
      typeof candidate.phone_code === 'string' &&
      typeof candidate.iso_code === 'string' &&
      typeof candidate.language === 'string'
    );
  }

  /**
   * AG Grid column definitions for the countries catalog.
   */
  protected readonly columnDefs = computed<ColDef<CountryListItem>[]>(() => [
    {
      field: 'name',
      headerValueGetter: () => this.translate.instant('configuration.countries.fields.name'),
      flex: 1.25,
      minWidth: 220,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'phone_code',
      headerValueGetter: () => this.translate.instant('configuration.countries.fields.phone_code'),
      flex: 0.65,
      minWidth: 130,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'iso_code',
      headerValueGetter: () => this.translate.instant('configuration.countries.fields.iso_code'),
      flex: 0.65,
      minWidth: 130,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'language',
      headerValueGetter: () => this.translate.instant('configuration.countries.fields.language'),
      flex: 0.75,
      minWidth: 150,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
  ]);

  /**
   * Receives row selection changes from the reusable table component.
   */
  protected onSelectionChange(rows: unknown[]): void {
    this.selectedCountries.set(rows as CountryListItem[]);
  }

  /**
   * Opens the create country flow.
   *
   * Uses `executeMutationRequest()` so the component only handles the successful
   * business result while API failure, success feedback, loading state, and HTTP
   * errors are handled by the shared base classes.
   */
  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<Partial<CountryListItem> & { languages: CountryLanguageOption[] }, ICountryModalResult>({
      component: CountriesModalComponent,
      data: {
        languages: this.languages(),
      },
      title: this.translate.instant('configuration.countries.add'),
      description: this.translate.instant('configuration.countries.messages.create-description'),
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

    this.executeMutationRequest(this.api.post<CountryMutationData>(route, result.payload), (res) => {
      const createdCountry =
        this.extractMutationItem(res.data, this.isCountryListItem, 'country') ??
        this.extractMutationItem(res.data, this.isCountryListItem, 'item') ??
        (this.isCountryListItem(res.data) ? res.data : undefined);

      if (!createdCountry) {
        this.reloadCountries();
        return;
      }

      this.applyCreatedItem(this.countries, createdCountry);
      this.clearSelection(this.selectedCountries);
    });
  }

  /**
   * Opens the edit country flow only when exactly one record is selected.
   *
   * The mutation response may return the updated record directly or wrapped in a
   * backend-specific payload. The component normalizes that shape before
   * updating local state.
   */
  protected async onEdit(): Promise<void> {
    const selected = this.selectedCountries();

    if (selected.length !== 1) {
      return;
    }

    const country = selected[0];
    const route = this.apiRoute();

    if (!route || !country.id) {
      return;
    }

    const result = await this.modal.open<CountryListItem & { languages: CountryLanguageOption[] }, ICountryModalResult>({
      component: CountriesModalComponent,
      data: {
        ...country,
        languages: this.languages(),
      },
      title: this.translate.instant('configuration.countries.update'),
      description: this.translate.instant('configuration.countries.messages.update-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.executeMutationRequest(
      this.api.put<CountryMutationData>(`${route}/${country.id}`, result.payload),
      (res) => {
        const updatedCountry =
          this.extractMutationItem(res.data, this.isCountryListItem, 'country') ??
          this.extractMutationItem(res.data, this.isCountryListItem, 'item') ??
          (this.isCountryListItem(res.data) ? res.data : undefined);

        if (!updatedCountry) {
          this.reloadCountries();
          return;
        }

        this.applyUpdatedItem(this.countries, updatedCountry);
        this.selectedCountries.set([updatedCountry]);
      },
    );
  }

  /**
   * Confirms and deletes the currently selected country.
   *
   * Delete confirmation is delegated to `BaseCrud.confirmDelete()`. The actual
   * mutation is executed through `executeMutationRequest()` so standard success
   * and error behavior remains centralized.
   */
  protected async onDelete(): Promise<void> {
    const selected = this.selectedCountries();

    if (selected.length !== 1) {
      return;
    }

    const country = selected[0];
    const route = this.apiRoute();

    if (!route || !country.id) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.countries.delete',
      'configuration.countries.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.executeMutationRequest(this.api.delete<unknown>(`${route}/${country.id}`), () => {
      this.applyDeletedItem(this.countries, country.id);
      this.clearSelection(this.selectedCountries);
    });
  }

  /**
   * Reloads the catalog from the backend without showing a success toast.
   *
   * Uses `executeSilentRequest()` because loading catalog data should update the
   * UI silently. API failures and HTTP errors are still handled centrally.
   */
  protected reloadCountries(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest(this.api.get<CountriesIndexData | CountryListItem[]>(route), (res) => {
      const countries = Array.isArray(res.data)
        ? res.data
        : res.data?.countries ?? [];

      const languages = Array.isArray(res.data)
        ? []
        : res.data?.languages ?? [];

      this.countries.set(countries);
      this.languages.set(languages);
      this.clearSelection(this.selectedCountries);
    });
  }

  /**
   * Initializes screen metadata and performs the first catalog load.
   */
  ngOnInit(): void {
    this.initRouteMeta(); 
    this.reloadCountries();
  }
}
