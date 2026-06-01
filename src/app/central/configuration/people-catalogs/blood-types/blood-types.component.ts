import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '../../../../shared/base/base-crud';
import { SkolansTable } from '../../../../shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { BloodTypesModalComponent } from '../blood-types-modal/blood-types-modal.component';

/**
 * Shape used by the blood types catalog table.
 */
interface BloodTypeListItem {
  id: number;
  name: string;
}

/**
 * Result returned by the blood type modal after a successful submit.
 */
interface IBloodTypeModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
  };
}

/**
 * Data returned by the blood types index endpoint.
 */
interface BloodTypesIndexData {
  blood_types?: BloodTypeListItem[];
  bloodTypes?: BloodTypeListItem[];
}

/**
 * Flexible item payload used by create/update endpoints while backend response
 * shapes are being standardized.
 */
interface BloodTypeMutationData extends Partial<BloodTypeListItem> {
  blood_type?: BloodTypeListItem;
  bloodType?: BloodTypeListItem;
  item?: BloodTypeListItem;
}

/**
 * Blood Types Component
 * ---------------------
 * Central people catalog screen used to manage blood types.
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
 * - Load blood types from the API.
 * - Define AG Grid columns for the catalog.
 * - Open create/edit modal flows.
 * - Persist CRUD actions through the shared API service.
 * - Keep the local table and selection state synchronized with API responses.
 */
@Component({
  selector: 'app-blood-types',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './blood-types.component.html',
  styleUrl: './blood-types.component.scss',
})
export class BloodTypesComponent extends BaseCrud<BloodTypeListItem> implements OnInit {
  /** Blood types currently loaded in the grid. */
  protected readonly bloodTypes = signal<BloodTypeListItem[]>([]);

  /** Currently selected rows in the grid. */
  protected readonly selectedBloodTypes = signal<BloodTypeListItem[]>([]);

  /** True when the screen currently has any selected record. */
  protected readonly hasSelection = computed(() => this.selectedBloodTypes().length > 0);

  /**
   * Validates whether an unknown backend payload can be used as a blood type row.
   */
  private isBloodTypeListItem(value: unknown): value is BloodTypeListItem {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<BloodTypeListItem>;

    return typeof candidate.id === 'number' && typeof candidate.name === 'string';
  }

  /**
   * AG Grid column definitions for the blood types catalog.
   */
  protected readonly columnDefs = computed<ColDef<BloodTypeListItem>[]>(() => [
    {
      field: 'name',
      headerValueGetter: () => this.translate.instant('configuration.blood-types.fields.name'),
      flex: 1,
      minWidth: 180,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
  ]);

  /**
   * Receives row selection changes from the reusable table component.
   */
  protected onSelectionChange(rows: unknown[]): void {
    this.selectedBloodTypes.set(rows as BloodTypeListItem[]);
  }

  /**
   * Opens the create blood type flow.
   */
  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<null, IBloodTypeModalResult>({
      component: BloodTypesModalComponent,
      data: null,
      title: this.translate.instant('configuration.blood-types.add'),
      description: this.translate.instant('configuration.blood-types.messages.create-description'),
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

    this.request(this.api.post<BloodTypeMutationData>(route, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const createdBloodType =
          this.extractMutationItem(res.data, this.isBloodTypeListItem, 'blood_type') ??
          this.extractMutationItem(res.data, this.isBloodTypeListItem, 'bloodType') ??
          this.extractMutationItem(res.data, this.isBloodTypeListItem, 'item') ??
          (this.isBloodTypeListItem(res.data) ? res.data : undefined);

        if (!createdBloodType) {
          this.reloadBloodTypes();
          return;
        }

        this.handleApiSuccess(res);
        this.applyCreatedItem(this.bloodTypes, createdBloodType);
        this.clearSelection(this.selectedBloodTypes);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Opens the edit blood type flow only when exactly one record is selected.
   */
  protected async onEdit(): Promise<void> {
    const selected = this.selectedBloodTypes();

    if (selected.length !== 1) {
      return;
    }

    const bloodType = selected[0];
    const route = this.apiRoute();

    if (!route || !bloodType.id) {
      return;
    }

    const result = await this.modal.open<BloodTypeListItem, IBloodTypeModalResult>({
      component: BloodTypesModalComponent,
      data: bloodType,
      title: this.translate.instant('configuration.blood-types.update'),
      description: this.translate.instant('configuration.blood-types.messages.update-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.request(this.api.put<BloodTypeMutationData>(`${route}/${bloodType.id}`, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const updatedBloodType =
          this.extractMutationItem(res.data, this.isBloodTypeListItem, 'blood_type') ??
          this.extractMutationItem(res.data, this.isBloodTypeListItem, 'bloodType') ??
          this.extractMutationItem(res.data, this.isBloodTypeListItem, 'item') ??
          (this.isBloodTypeListItem(res.data) ? res.data : undefined);

        if (!updatedBloodType) {
          this.reloadBloodTypes();
          return;
        }

        this.handleApiSuccess(res);
        this.applyUpdatedItem(this.bloodTypes, updatedBloodType);
        this.selectedBloodTypes.set([updatedBloodType]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Confirms and deletes the currently selected blood type.
   */
  protected async onDelete(): Promise<void> {
    const selected = this.selectedBloodTypes();

    if (selected.length !== 1) {
      return;
    }

    const bloodType = selected[0];
    const route = this.apiRoute();

    if (!route || !bloodType.id) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.blood-types.delete',
      'configuration.blood-types.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.request(this.api.delete<unknown>(`${route}/${bloodType.id}`)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);
        this.applyDeletedItem(this.bloodTypes, bloodType.id);
        this.clearSelection(this.selectedBloodTypes);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Reloads the catalog from the backend.
   */
  protected reloadBloodTypes(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.request(this.api.get<BloodTypesIndexData | BloodTypeListItem[]>(route)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const bloodTypes = Array.isArray(res.data)
          ? res.data
          : res.data?.blood_types ?? res.data?.bloodTypes ?? [];

        this.bloodTypes.set(bloodTypes);
        this.clearSelection(this.selectedBloodTypes);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Initializes screen metadata and performs the first catalog load.
   */
  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadBloodTypes();
  }
}
