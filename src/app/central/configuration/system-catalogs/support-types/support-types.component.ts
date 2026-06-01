import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '../../../../shared/base/base-crud';
import { SkolansTable } from '../../../../shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { SupportTypesModalComponent } from '../support-types-modal/support-types-modal.component';

/**
 * Shape used by the support types catalog table.
 */
interface SupportTypeListItem {
  id: number;
  name: string;
  translation: string;
}

/**
 * Result returned by the support type modal after a successful submit.
 */
interface ISupportTypeModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string;
  };
}

/**
 * Data returned by the support types index endpoint.
 */
interface SupportTypesIndexData {
  support_types?: SupportTypeListItem[];
  supportTypes?: SupportTypeListItem[];
}

/**
 * Flexible item payload used by create/update endpoints while backend response
 * shapes are being standardized.
 */
interface SupportTypeMutationData extends Partial<SupportTypeListItem> {
  support_type?: SupportTypeListItem;
  supportType?: SupportTypeListItem;
  item?: SupportTypeListItem;
}

/**
 * Support Types Component
 * -----------------------
 * Central system catalog screen used to manage support types.
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
 * - Load support types from the API.
 * - Define AG Grid columns for the catalog.
 * - Open create/edit modal flows.
 * - Persist CRUD actions through the shared API service.
 * - Keep the local table and selection state synchronized with API responses.
 */
@Component({
  selector: 'app-support-types',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './support-types.component.html',
  styleUrl: './support-types.component.scss',
})
export class SupportTypesComponent extends BaseCrud<SupportTypeListItem> implements OnInit {
  /** Support types currently loaded in the grid. */
  protected readonly supportTypes = signal<SupportTypeListItem[]>([]);

  /** Currently selected rows in the grid. */
  protected readonly selectedSupportTypes = signal<SupportTypeListItem[]>([]);

  /** True when the screen currently has any selected record. */
  protected readonly hasSelection = computed(() => this.selectedSupportTypes().length > 0);

  /**
   * Validates whether an unknown backend payload can be used as a support type row.
   */
  private isSupportTypeListItem(value: unknown): value is SupportTypeListItem {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<SupportTypeListItem>;

    return (
      typeof candidate.id === 'number' &&
      typeof candidate.name === 'string' &&
      typeof candidate.translation === 'string'
    );
  }

  /**
   * AG Grid column definitions for the support types catalog.
   */
  protected readonly columnDefs = computed<ColDef<SupportTypeListItem>[]>(() => [
    {
      field: 'name',
      headerValueGetter: () => this.translate.instant('configuration.support-types.fields.name'),
      flex: 1,
      minWidth: 180,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'translation',
      headerValueGetter: () => this.translate.instant('configuration.support-types.fields.translation'),
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
    this.selectedSupportTypes.set(rows as SupportTypeListItem[]);
  }

  /**
   * Opens the create support type flow.
   */
  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<null, ISupportTypeModalResult>({
      component: SupportTypesModalComponent,
      data: null,
      title: this.translate.instant('configuration.support-types.add'),
      description: this.translate.instant('configuration.support-types.messages.create-description'),
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

    this.request(this.api.post<SupportTypeMutationData>(route, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const createdSupportType =
          this.extractMutationItem(res.data, this.isSupportTypeListItem, 'support_type') ??
          this.extractMutationItem(res.data, this.isSupportTypeListItem, 'supportType') ??
          this.extractMutationItem(res.data, this.isSupportTypeListItem, 'item') ??
          (this.isSupportTypeListItem(res.data) ? res.data : undefined);

        if (!createdSupportType) {
          this.reloadSupportTypes();
          return;
        }

        this.handleApiSuccess(res);
        this.applyCreatedItem(this.supportTypes, createdSupportType);
        this.clearSelection(this.selectedSupportTypes);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Opens the edit support type flow only when exactly one record is selected.
   */
  protected async onEdit(): Promise<void> {
    const selected = this.selectedSupportTypes();

    if (selected.length !== 1) {
      return;
    }

    const supportType = selected[0];
    const route = this.apiRoute();

    if (!route || !supportType.id) {
      return;
    }

    const result = await this.modal.open<SupportTypeListItem, ISupportTypeModalResult>({
      component: SupportTypesModalComponent,
      data: supportType,
      title: this.translate.instant('configuration.support-types.update'),
      description: this.translate.instant('configuration.support-types.messages.update-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.request(this.api.put<SupportTypeMutationData>(`${route}/${supportType.id}`, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const updatedSupportType =
          this.extractMutationItem(res.data, this.isSupportTypeListItem, 'support_type') ??
          this.extractMutationItem(res.data, this.isSupportTypeListItem, 'supportType') ??
          this.extractMutationItem(res.data, this.isSupportTypeListItem, 'item') ??
          (this.isSupportTypeListItem(res.data) ? res.data : undefined);

        if (!updatedSupportType) {
          this.reloadSupportTypes();
          return;
        }

        this.handleApiSuccess(res);
        this.applyUpdatedItem(this.supportTypes, updatedSupportType);
        this.selectedSupportTypes.set([updatedSupportType]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Confirms and deletes the currently selected support type.
   */
  protected async onDelete(): Promise<void> {
    const selected = this.selectedSupportTypes();

    if (selected.length !== 1) {
      return;
    }

    const supportType = selected[0];
    const route = this.apiRoute();

    if (!route || !supportType.id) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.support-types.delete',
      'configuration.support-types.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.request(this.api.delete<unknown>(`${route}/${supportType.id}`)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);
        this.applyDeletedItem(this.supportTypes, supportType.id);
        this.clearSelection(this.selectedSupportTypes);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Reloads the catalog from the backend.
   */
  protected reloadSupportTypes(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.request(this.api.get<SupportTypesIndexData | SupportTypeListItem[]>(route)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const supportTypes = Array.isArray(res.data)
          ? res.data
          : res.data?.support_types ?? res.data?.supportTypes ?? [];

        this.supportTypes.set(supportTypes);
        this.clearSelection(this.selectedSupportTypes);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Initializes screen metadata and performs the first catalog load.
   */
  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadSupportTypes();
  }
}
