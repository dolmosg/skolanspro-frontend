import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '../../../../shared/base/base-crud';
import { SkolansTable } from '../../../../shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { PasswordTypesModalComponent } from '../password-types-modal/password-types-modal.component';

/**
 * Shape used by the password types catalog table.
 */
interface PasswordTypeListItem {
  id: number;
  name: string;
  translation: string;
}

/**
 * Result returned by the password type modal after a successful submit.
 */
interface IPasswordTypeModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string;
  };
}

/**
 * Data returned by the password types index endpoint.
 */
interface PasswordTypesIndexData {
  password_types?: PasswordTypeListItem[];
  passwordTypes?: PasswordTypeListItem[];
}

/**
 * Flexible item payload used by create/update endpoints while backend response
 * shapes are being standardized.
 */
interface PasswordTypeMutationData extends Partial<PasswordTypeListItem> {
  password_type?: PasswordTypeListItem;
  passwordType?: PasswordTypeListItem;
  item?: PasswordTypeListItem;
}

/**
 * Password Types Component
 * ------------------------
 * Central system catalog screen used to manage password types.
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
 * - Load password types from the API.
 * - Define AG Grid columns for the catalog.
 * - Open create/edit modal flows.
 * - Persist CRUD actions through the shared API service.
 * - Keep the local table and selection state synchronized with API responses.
 */
@Component({
  selector: 'app-password-types',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './password-types.component.html',
  styleUrl: './password-types.component.scss',
})
export class PasswordTypesComponent extends BaseCrud<PasswordTypeListItem> implements OnInit {
  /** Password types currently loaded in the grid. */
  protected readonly passwordTypes = signal<PasswordTypeListItem[]>([]);

  /** Currently selected rows in the grid. */
  protected readonly selectedPasswordTypes = signal<PasswordTypeListItem[]>([]);

  /** True when the screen currently has any selected record. */
  protected readonly hasSelection = computed(() => this.selectedPasswordTypes().length > 0);

  /**
   * Validates whether an unknown backend payload can be used as a password type row.
   */
  private isPasswordTypeListItem(value: unknown): value is PasswordTypeListItem {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<PasswordTypeListItem>;

    return (
      typeof candidate.id === 'number' &&
      typeof candidate.name === 'string' &&
      typeof candidate.translation === 'string'
    );
  }

  /**
   * AG Grid column definitions for the password types catalog.
   */
  protected readonly columnDefs = computed<ColDef<PasswordTypeListItem>[]>(() => [
    {
      field: 'name',
      headerValueGetter: () => this.translate.instant('configuration.password-types.fields.name'),
      flex: 1,
      minWidth: 180,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'translation',
      headerValueGetter: () => this.translate.instant('configuration.password-types.fields.translation'),
      flex: 1.25,
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
    this.selectedPasswordTypes.set(rows as PasswordTypeListItem[]);
  }

  /**
   * Opens the create password type flow.
   */
  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<null, IPasswordTypeModalResult>({
      component: PasswordTypesModalComponent,
      data: null,
      title: this.translate.instant('configuration.password-types.add'),
      description: this.translate.instant('configuration.password-types.messages.create-description'),
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

    this.request(this.api.post<PasswordTypeMutationData>(route, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const createdPasswordType =
          this.extractMutationItem(res.data, this.isPasswordTypeListItem, 'password_type') ??
          this.extractMutationItem(res.data, this.isPasswordTypeListItem, 'passwordType') ??
          this.extractMutationItem(res.data, this.isPasswordTypeListItem, 'item') ??
          (this.isPasswordTypeListItem(res.data) ? res.data : undefined);

        if (!createdPasswordType) {
          this.reloadPasswordTypes();
          return;
        }

        this.handleApiSuccess(res);
        this.applyCreatedItem(this.passwordTypes, createdPasswordType);
        this.clearSelection(this.selectedPasswordTypes);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Opens the edit password type flow only when exactly one record is selected.
   */
  protected async onEdit(): Promise<void> {
    const selected = this.selectedPasswordTypes();

    if (selected.length !== 1) {
      return;
    }

    const passwordType = selected[0];
    const route = this.apiRoute();

    if (!route || !passwordType.id) {
      return;
    }

    const result = await this.modal.open<PasswordTypeListItem, IPasswordTypeModalResult>({
      component: PasswordTypesModalComponent,
      data: passwordType,
      title: this.translate.instant('configuration.password-types.update'),
      description: this.translate.instant('configuration.password-types.messages.update-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.request(this.api.put<PasswordTypeMutationData>(`${route}/${passwordType.id}`, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const updatedPasswordType =
          this.extractMutationItem(res.data, this.isPasswordTypeListItem, 'password_type') ??
          this.extractMutationItem(res.data, this.isPasswordTypeListItem, 'passwordType') ??
          this.extractMutationItem(res.data, this.isPasswordTypeListItem, 'item') ??
          (this.isPasswordTypeListItem(res.data) ? res.data : undefined);

        if (!updatedPasswordType) {
          this.reloadPasswordTypes();
          return;
        }

        this.handleApiSuccess(res);
        this.applyUpdatedItem(this.passwordTypes, updatedPasswordType);
        this.selectedPasswordTypes.set([updatedPasswordType]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Confirms and deletes the currently selected password type.
   */
  protected async onDelete(): Promise<void> {
    const selected = this.selectedPasswordTypes();

    if (selected.length !== 1) {
      return;
    }

    const passwordType = selected[0];
    const route = this.apiRoute();

    if (!route || !passwordType.id) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.password-types.delete',
      'configuration.password-types.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.request(this.api.delete<unknown>(`${route}/${passwordType.id}`)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);
        this.applyDeletedItem(this.passwordTypes, passwordType.id);
        this.clearSelection(this.selectedPasswordTypes);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Reloads the catalog from the backend.
   */
  protected reloadPasswordTypes(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.request(this.api.get<PasswordTypesIndexData | PasswordTypeListItem[]>(route)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const passwordTypes = Array.isArray(res.data)
          ? res.data
          : res.data?.password_types ?? res.data?.passwordTypes ?? [];

        this.passwordTypes.set(passwordTypes);
        this.clearSelection(this.selectedPasswordTypes);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Initializes screen metadata and performs the first catalog load.
   */
  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadPasswordTypes();
  }
}
