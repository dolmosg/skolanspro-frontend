import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '../../../../shared/base/base-crud';
import { SkolansTable } from '../../../../shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { LanguagesModalComponent } from '../languages-modal/languages-modal.component';

/**
 * Shape used by the languages catalog table.
 */
interface LanguageListItem {
  id: number;
  name: string;
  label: string;
  code: string;
  icon?: string | null;
  direction: string;
  shorthand: string;
  active: boolean | number;
  order: number;
}

/**
 * Result returned by the language modal after a successful submit.
 */
interface ILanguageModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    label: string;
    code: string;
    icon?: string | null;
    direction: string;
    shorthand: string;
    active: boolean;
    order: number;
  };
}

/**
 * Data returned by the languages index endpoint.
 */
interface LanguagesIndexData {
  languages?: LanguageListItem[];
}

/**
 * Flexible item payload used by create/update endpoints while backend response
 * shapes are being standardized.
 */
interface LanguageMutationData extends Partial<LanguageListItem> {
  language?: LanguageListItem;
  item?: LanguageListItem;
}

/**
 * Languages Component
 * -------------------
 * Central localization catalog screen used to manage supported languages.
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
 * - Load languages from the API.
 * - Define AG Grid columns for the catalog.
 * - Open create/edit modal flows.
 * - Persist CRUD actions through the shared API service.
 * - Keep the local table and selection state synchronized with API responses.
 */
@Component({
  selector: 'app-languages',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './languages.component.html',
  styleUrl: './languages.component.scss',
})
export class LanguagesComponent extends BaseCrud<LanguageListItem> implements OnInit {
  /** Languages currently loaded in the grid. */
  protected readonly languages = signal<LanguageListItem[]>([]);

  /** Currently selected rows in the grid. */
  protected readonly selectedLanguages = signal<LanguageListItem[]>([]);

  /** True when the screen currently has any selected record. */
  protected readonly hasSelection = computed(() => this.selectedLanguages().length > 0);

  /**
   * Validates whether an unknown backend payload can be used as a language row.
   */
  private isLanguageListItem(value: unknown): value is LanguageListItem {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<LanguageListItem>;

    return (
      typeof candidate.id === 'number' &&
      typeof candidate.name === 'string' &&
      typeof candidate.label === 'string' &&
      typeof candidate.code === 'string' &&
      typeof candidate.direction === 'string' &&
      typeof candidate.shorthand === 'string' &&
      typeof candidate.order === 'number'
    );
  }

  /**
   * AG Grid column definitions for the languages catalog.
   */
  protected readonly columnDefs = computed<ColDef<LanguageListItem>[]>(() => [
    {
      field: 'name',
      headerValueGetter: () => this.translate.instant('configuration.languages.fields.name'),
      flex: 1,
      minWidth: 160,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'label',
      headerValueGetter: () => this.translate.instant('configuration.languages.fields.label'),
      flex: 1.25,
      minWidth: 200,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
      valueGetter: (params) => {
        const key = params.data?.label;
        return key ? this.translate.instant(key) : '';
      },
    },
    {
      field: 'code',
      headerValueGetter: () => this.translate.instant('configuration.languages.fields.code'),
      flex: 0.75,
      minWidth: 130,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'shorthand',
      headerValueGetter: () => this.translate.instant('configuration.languages.fields.shorthand'),
      flex: 0.75,
      minWidth: 130,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'direction',
      headerValueGetter: () => this.translate.instant('configuration.languages.fields.direction'),
      flex: 0.75,
      minWidth: 130,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'active',
      headerValueGetter: () => this.translate.instant('configuration.languages.fields.active'),
      flex: 0.6,
      minWidth: 120,
      valueGetter: (params) =>
        params.data?.active
          ? this.translate.instant('common.yes')
          : this.translate.instant('common.no'),
    },
  ]);

  /**
   * Receives row selection changes from the reusable table component.
   */
  protected onSelectionChange(rows: unknown[]): void {
    this.selectedLanguages.set(rows as LanguageListItem[]);
  }

  /**
   * Opens the create language flow.
   */
  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<Partial<LanguageListItem>, ILanguageModalResult>({
      component: LanguagesModalComponent,
      data: {
        order: this.languages().length,
      },
      title: this.translate.instant('configuration.languages.add'),
      description: this.translate.instant('configuration.languages.messages.create-description'),
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

    this.request(this.api.post<LanguageMutationData>(route, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const createdLanguage =
          this.extractMutationItem(res.data, this.isLanguageListItem, 'language') ??
          this.extractMutationItem(res.data, this.isLanguageListItem, 'item') ??
          (this.isLanguageListItem(res.data) ? res.data : undefined);

        if (!createdLanguage) {
          this.reloadLanguages();
          return;
        }

        this.handleApiSuccess(res);
        this.applyCreatedItem(this.languages, createdLanguage);
        this.clearSelection(this.selectedLanguages);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Opens the edit language flow only when exactly one record is selected.
   */
  protected async onEdit(): Promise<void> {
    const selected = this.selectedLanguages();

    if (selected.length !== 1) {
      return;
    }

    const language = selected[0];
    const route = this.apiRoute();

    if (!route || !language.id) {
      return;
    }

    const result = await this.modal.open<LanguageListItem, ILanguageModalResult>({
      component: LanguagesModalComponent,
      data: language,
      title: this.translate.instant('configuration.languages.update'),
      description: this.translate.instant('configuration.languages.messages.update-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.request(this.api.put<LanguageMutationData>(`${route}/${language.id}`, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const updatedLanguage =
          this.extractMutationItem(res.data, this.isLanguageListItem, 'language') ??
          this.extractMutationItem(res.data, this.isLanguageListItem, 'item') ??
          (this.isLanguageListItem(res.data) ? res.data : undefined);

        if (!updatedLanguage) {
          this.reloadLanguages();
          return;
        }

        this.handleApiSuccess(res);
        this.applyUpdatedItem(this.languages, updatedLanguage);
        this.selectedLanguages.set([updatedLanguage]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Confirms and deletes the currently selected language.
   */
  protected async onDelete(): Promise<void> {
    const selected = this.selectedLanguages();

    if (selected.length !== 1) {
      return;
    }

    const language = selected[0];
    const route = this.apiRoute();

    if (!route || !language.id) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.languages.delete',
      'configuration.languages.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.request(this.api.delete<unknown>(`${route}/${language.id}`)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);
        this.applyDeletedItem(this.languages, language.id);
        this.clearSelection(this.selectedLanguages);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Reloads the catalog from the backend.
   */
  protected reloadLanguages(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.request(this.api.get<LanguagesIndexData | LanguageListItem[]>(route)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const languages = Array.isArray(res.data)
          ? res.data
          : res.data?.languages ?? [];

        this.languages.set(languages);
        this.clearSelection(this.selectedLanguages);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Initializes screen metadata and performs the first catalog load.
   */
  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadLanguages();
  }
}
