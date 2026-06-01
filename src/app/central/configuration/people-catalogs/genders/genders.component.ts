import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';

import { BaseCrud } from '../../../../shared/base/base-crud';
import { SkolansTable } from '../../../../shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { UiIconComponent } from '../../../../shared/ui/ui-icon/ui-icon';
import { GendersModalComponent } from '../genders-modal/genders-modal.component';

@Component({
  selector: 'app-gender-icon-cell',
  standalone: true,
  imports: [CommonModule, UiIconComponent],
  template: `
    <div style="display:flex; align-items:center; gap:6px;">
      <app-ui-icon [name]="value" size="sm"></app-ui-icon>
      <span>{{ value }}</span>
    </div>
  `,
})
class GenderIconCellRenderer implements ICellRendererAngularComp {
  value = '';

  agInit(params: ICellRendererParams<GenderListItem, string>): void {
    this.value = params.value ?? '';
  }

  refresh(params: ICellRendererParams<GenderListItem, string>): boolean {
    this.value = params.value ?? '';
    return true;
  }
}

/**
 * Shape used by the genders catalog table.
 */
interface GenderListItem {
  id: number;
  name: string;
  translation?: string;
  icon: string;
}

/**
 * Result returned by the gender modal after a successful submit.
 */
interface IGenderModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string;
    icon: string;
  };
}

/**
 * Data returned by the genders index endpoint.
 */
interface GendersIndexData {
  genders?: GenderListItem[];
}

/**
 * Flexible item payload used by create/update endpoints while backend response
 * shapes are being standardized.
 */
interface GenderMutationData extends Partial<GenderListItem> {
  gender?: GenderListItem;
  item?: GenderListItem;
}

/**
 * Genders Component
 * -----------------
 * Central people catalog screen used to manage genders.
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
 * - Load genders from the API.
 * - Define AG Grid columns for the catalog.
 * - Open create/edit modal flows.
 * - Persist CRUD actions through the shared API service.
 * - Keep the local table and selection state synchronized with API responses.
 */
@Component({
  selector: 'app-genders',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './genders.component.html',
  styleUrl: './genders.component.scss',
})
export class GendersComponent extends BaseCrud<GenderListItem> implements OnInit {
  /** Genders currently loaded in the grid. */
  protected readonly genders = signal<GenderListItem[]>([]);

  /** Currently selected rows in the grid. */
  protected readonly selectedGenders = signal<GenderListItem[]>([]);

  /** True when the screen currently has any selected record. */
  protected readonly hasSelection = computed(() => this.selectedGenders().length > 0);

  /**
   * Validates whether an unknown backend payload can be used as a gender row.
   */
  private isGenderListItem(value: unknown): value is GenderListItem {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<GenderListItem>;

    return (
      typeof candidate.id === 'number' &&
      typeof candidate.name === 'string' &&
      typeof candidate.icon === 'string'
    );
  }

  /**
   * AG Grid column definitions for the genders catalog.
   *
   * Column ownership stays in the screen component because presentation
   * belongs to the parent catalog, not to the generic table wrapper.
   */
  protected readonly columnDefs = computed<ColDef<GenderListItem>[]>(() => [
    {
      field: 'name',
      headerValueGetter: () => this.translate.instant('configuration.genders.fields.name'),
      flex: 1,
      minWidth: 180,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'translation',
      headerValueGetter: () => this.translate.instant('configuration.genders.fields.translation'),
      flex: 1,
      minWidth: 260,
      valueGetter: (params) => {
        const key = params.data?.translation;
        return key ? this.translate.instant(key) : '';
      },
    },
    {
      field: 'icon',
      headerValueGetter: () => this.translate.instant('configuration.genders.fields.icon'),
      flex: 0.75,
      minWidth: 160,
      cellRenderer: GenderIconCellRenderer,
    },
  ]);

  /**
   * Receives row selection changes from the reusable table component.
   */
  protected onSelectionChange(rows: unknown[]): void {
    this.selectedGenders.set(rows as GenderListItem[]);
  }

  /**
   * Opens the create gender flow.
   */
  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<null, IGenderModalResult>({
      component: GendersModalComponent,
      data: null,
      title: this.translate.instant('configuration.genders.add'),
      description: this.translate.instant('configuration.genders.messages.create-description'),
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

    this.request(this.api.post<GenderMutationData>(route, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const createdGender = this.extractMutationItem(
          res.data,
          this.isGenderListItem,
          'gender',
        );

        if (!createdGender) {
          this.reloadGenders();
          return;
        }

        this.handleApiSuccess(res);
        this.applyCreatedItem(this.genders, createdGender);
        this.clearSelection(this.selectedGenders);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Opens the edit gender flow only when exactly one gender is selected.
   */
  protected async onEdit(): Promise<void> {
    const selected = this.selectedGenders();

    if (selected.length !== 1) {
      return;
    }

    const gender = selected[0];
    const route = this.apiRoute();

    if (!route || !gender.id) {
      return;
    }

    const result = await this.modal.open<GenderListItem, IGenderModalResult>({
      component: GendersModalComponent,
      data: gender,
      title: this.translate.instant('configuration.genders.update'),
      description: this.translate.instant('configuration.genders.messages.update-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.request(this.api.put<GenderMutationData>(`${route}/${gender.id}`, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const updatedGender = this.extractMutationItem(
          res.data,
          this.isGenderListItem,
          'gender',
        );

        if (!updatedGender) {
          this.reloadGenders();
          return;
        }

        this.handleApiSuccess(res);
        this.applyUpdatedItem(this.genders, updatedGender);
        this.selectedGenders.set([updatedGender]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Confirms and deletes the currently selected gender.
   */
  protected async onDelete(): Promise<void> {
    const selected = this.selectedGenders();

    if (selected.length !== 1) {
      return;
    }

    const gender = selected[0];
    const route = this.apiRoute();

    if (!route || !gender.id) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.genders.delete',
      'configuration.genders.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.request(this.api.delete<unknown>(`${route}/${gender.id}`)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);
        this.applyDeletedItem(this.genders, gender.id);
        this.clearSelection(this.selectedGenders);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Reloads the catalog from the backend.
   */
  protected reloadGenders(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.request(this.api.get<GendersIndexData | GenderListItem[]>(route)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const genders = Array.isArray(res.data)
          ? res.data
          : res.data?.genders ?? [];

        this.genders.set(genders);
        this.clearSelection(this.selectedGenders);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Initializes screen metadata and performs the first catalog load.
   */
  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadGenders();
  }
}
