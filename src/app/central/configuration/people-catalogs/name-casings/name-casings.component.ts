import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '../../../../shared/base/base-crud';
import { SkolansTable } from '../../../../shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { NameCasingsModalComponent } from '../name-casings-modal/name-casings-modal.component';

/**
 * Shape used by the name casings catalog table.
 */
interface NameCasingListItem {
  id: number;
  name: string;
  translation: string;
}

/**
 * Result returned by the name casing modal after a successful submit.
 */
interface INameCasingModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string;
  };
}

/**
 * Data returned by the name casings index endpoint.
 */
interface NameCasingsIndexData {
  name_casings?: NameCasingListItem[];
  nameCasings?: NameCasingListItem[];
}

/**
 * Flexible item payload used by create/update endpoints while backend response
 * shapes are being standardized.
 */
interface NameCasingMutationData extends Partial<NameCasingListItem> {
  name_casing?: NameCasingListItem;
  nameCasing?: NameCasingListItem;
  item?: NameCasingListItem;
}

/**
 * Name Casings Component
 * ----------------------
 * Central people catalog screen used to manage name casing options.
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
 * - Load name casings from the API.
 * - Define AG Grid columns for the catalog.
 * - Open create/edit modal flows.
 * - Persist CRUD actions through the shared API service.
 * - Keep the local table and selection state synchronized with API responses.
 */
@Component({
  selector: 'app-name-casings',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './name-casings.component.html',
  styleUrl: './name-casings.component.scss',
})
export class NameCasingsComponent extends BaseCrud<NameCasingListItem> implements OnInit {
  /** Name casings currently loaded in the grid. */
  protected readonly nameCasings = signal<NameCasingListItem[]>([]);

  /** Currently selected rows in the grid. */
  protected readonly selectedNameCasings = signal<NameCasingListItem[]>([]);

  /** True when the screen currently has any selected record. */
  protected readonly hasSelection = computed(() => this.selectedNameCasings().length > 0);

  /**
   * Validates whether an unknown backend payload can be used as a name casing row.
   */
  private isNameCasingListItem(value: unknown): value is NameCasingListItem {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<NameCasingListItem>;

    return (
      typeof candidate.id === 'number' &&
      typeof candidate.name === 'string' &&
      typeof candidate.translation === 'string'
    );
  }

  /**
   * AG Grid column definitions for the name casings catalog.
   */
  protected readonly columnDefs = computed<ColDef<NameCasingListItem>[]>(() => [
    {
      field: 'name',
      headerValueGetter: () => this.translate.instant('configuration.name-casings.fields.name'),
      flex: 1,
      minWidth: 180,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'translation',
      headerValueGetter: () => this.translate.instant('configuration.name-casings.fields.translation'),
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
    this.selectedNameCasings.set(rows as NameCasingListItem[]);
  }

  /**
   * Opens the create name casing flow.
   */
  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<null, INameCasingModalResult>({
      component: NameCasingsModalComponent,
      data: null,
      title: this.translate.instant('configuration.name-casings.add'),
      description: this.translate.instant('configuration.name-casings.messages.create-description'),
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

    this.request(this.api.post<NameCasingMutationData>(route, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const createdNameCasing =
          this.extractMutationItem(res.data, this.isNameCasingListItem, 'name_casing') ??
          this.extractMutationItem(res.data, this.isNameCasingListItem, 'nameCasing') ??
          this.extractMutationItem(res.data, this.isNameCasingListItem, 'item') ??
          (this.isNameCasingListItem(res.data) ? res.data : undefined);

        if (!createdNameCasing) {
          this.reloadNameCasings();
          return;
        }

        this.handleApiSuccess(res);
        this.applyCreatedItem(this.nameCasings, createdNameCasing);
        this.clearSelection(this.selectedNameCasings);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Opens the edit name casing flow only when exactly one record is selected.
   */
  protected async onEdit(): Promise<void> {
    const selected = this.selectedNameCasings();

    if (selected.length !== 1) {
      return;
    }

    const nameCasing = selected[0];
    const route = this.apiRoute();

    if (!route || !nameCasing.id) {
      return;
    }

    const result = await this.modal.open<NameCasingListItem, INameCasingModalResult>({
      component: NameCasingsModalComponent,
      data: nameCasing,
      title: this.translate.instant('configuration.name-casings.update'),
      description: this.translate.instant('configuration.name-casings.messages.update-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.request(this.api.put<NameCasingMutationData>(`${route}/${nameCasing.id}`, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const updatedNameCasing =
          this.extractMutationItem(res.data, this.isNameCasingListItem, 'name_casing') ??
          this.extractMutationItem(res.data, this.isNameCasingListItem, 'nameCasing') ??
          this.extractMutationItem(res.data, this.isNameCasingListItem, 'item') ??
          (this.isNameCasingListItem(res.data) ? res.data : undefined);

        if (!updatedNameCasing) {
          this.reloadNameCasings();
          return;
        }

        this.handleApiSuccess(res);
        this.applyUpdatedItem(this.nameCasings, updatedNameCasing);
        this.selectedNameCasings.set([updatedNameCasing]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Confirms and deletes the currently selected name casing.
   */
  protected async onDelete(): Promise<void> {
    const selected = this.selectedNameCasings();

    if (selected.length !== 1) {
      return;
    }

    const nameCasing = selected[0];
    const route = this.apiRoute();

    if (!route || !nameCasing.id) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.name-casings.delete',
      'configuration.name-casings.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.request(this.api.delete<unknown>(`${route}/${nameCasing.id}`)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);
        this.applyDeletedItem(this.nameCasings, nameCasing.id);
        this.clearSelection(this.selectedNameCasings);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Reloads the catalog from the backend.
   */
  protected reloadNameCasings(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.request(this.api.get<NameCasingsIndexData | NameCasingListItem[]>(route)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const nameCasings = Array.isArray(res.data)
          ? res.data
          : res.data?.name_casings ?? res.data?.nameCasings ?? [];

        this.nameCasings.set(nameCasings);
        this.clearSelection(this.selectedNameCasings);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Initializes screen metadata and performs the first catalog load.
   */
  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadNameCasings();
  }
}
