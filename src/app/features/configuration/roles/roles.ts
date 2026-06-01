import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '../../../shared/base/base-crud';
import { SkolansTable } from '../../../shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '../../../shared/ui/ui-button/ui-button';
import { RolesModalComponent } from '../roles-modal-component/roles-modal-component';

/**
 * Shape used by the roles catalog table.
 */
interface RoleListItem {
  id: number;
  name: string;
  translation?: string;
  path?: string;
  help?: string;
  internal:boolean
}

/**
 * Result returned by the role modal after a successful submit.
 */
interface IRoleModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string;
    path: string;
    help: string;
  };
}

/**
 * Data returned by the roles index endpoint.
 */
interface RolesIndexData {
  roles?: RoleListItem[];
}

/**
 * Flexible item payload used by create/update endpoints while backend response
 * shapes are being standardized.
 */
interface RoleMutationData extends Partial<RoleListItem> {
  role?: RoleListItem;
  item?: RoleListItem;
}

/**
 * Roles Component
 * ---------------
 * Shared configuration catalog screen used to manage roles.
 *
 * This component is intentionally located under `features/configuration` because
 * it can be routed from both central and tenant contexts. The active route
 * metadata determines the API endpoint through `SkolansBaseComponent` inherited
 * by `BaseCrud`.
 *
 * CRUD conventions implemented here:
 * - Extends `BaseCrud` for shared API response, toast, confirm-delete, and
 *   local state update helpers.
 * - Uses the official API envelope `{ success, data, message }`.
 * - Logical API failures are handled through `handleApiFailure()`.
 * - Successful mutations show feedback through `handleApiSuccess()`.
 * - Create/update payloads are normalized from flexible response shapes.
 * - Delete confirmation is centralized through `confirmDelete()`.
 * - The add action remains always available; edit/delete are contextual in the
 *   template and only shown when a record is selected.
 *
 * Responsibilities:
 * - Resolve route metadata and backend endpoint.
 * - Load roles from the API.
 * - Define AG Grid columns for the catalog.
 * - Open create/edit modal flows.
 * - Persist CRUD actions through the shared API service.
 * - Keep the local table and selection state synchronized with API responses.
 */
@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './roles.html',
  styleUrl: './roles.scss',
})
export class Roles extends BaseCrud<RoleListItem> implements OnInit {
  /** Roles currently loaded in the grid. */
  protected readonly roles = signal<RoleListItem[]>([]);

  /** Currently selected rows in the grid. */
  protected readonly selectedRoles = signal<RoleListItem[]>([]);

  /** True when the screen currently has any selected record. */
  protected readonly hasSelection = computed(() => this.selectedRoles().length > 0);

  /**
   * Validates whether an unknown backend payload can be used as a role row.
   */
  private isRoleListItem(value: unknown): value is RoleListItem {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<RoleListItem>;

    return typeof candidate.id === 'number' && typeof candidate.name === 'string';
  }

  /**
   * AG Grid column definitions for the roles catalog.
   *
   * Column ownership stays in the screen component because presentation
   * belongs to the parent catalog, not to the generic table wrapper.
   */
  protected readonly columnDefs = computed<ColDef<RoleListItem>[]>(() => [
    {
      field: 'name',
      headerValueGetter: () => this.translate.instant('configuration.roles.fields.name'),
      flex: 1,
      minWidth: 180,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'translation',
      headerValueGetter: () => this.translate.instant('configuration.roles.fields.translation'),
      flex: 1,
      minWidth: 260,
      valueGetter: (params) => {
        const key = params.data?.translation;
        return key ? this.translate.instant(key) : '';
      },
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'path',
      headerValueGetter: () => this.translate.instant('configuration.roles.fields.path'),
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'help',
      headerValueGetter: () => this.translate.instant('configuration.roles.fields.help'),
      flex: 1.25,
      minWidth: 260,
      valueGetter: (params) => {
        const key = params.data?.help;
        return key ? this.translate.instant(key) : '';
      },
    },
    {
      field: 'internal',
      headerValueGetter: () => this.translate.instant('configuration.roles.fields.internal'),
      width: 140,
      valueGetter: (params) =>
        params.data?.internal
          ? this.translate.instant('common.yes')
          : this.translate.instant('common.no'),
    },
  ]);

  /**
   * Receives row selection changes from the reusable table component.
   */
  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRoles.set(rows as RoleListItem[]);
  }

  /**
   * Opens the create role flow.
   *
   * Notes:
   * - Creation always opens the modal without preloaded role data.
   * - The modal only returns validated payload.
   * - Persistence is handled here in the screen component.
   */
  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<null, IRoleModalResult>({
      component: RolesModalComponent,
      data: null,
      title: this.translate.instant('configuration.roles.add'),
      description: this.translate.instant('configuration.roles.messages.create-description'),
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

    this.request(this.api.post<RoleMutationData>(route, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const createdRole = this.extractMutationItem(res.data, this.isRoleListItem, 'role');

        if (!createdRole) {
          this.reloadRoles();
          return;
        }

        this.handleApiSuccess(res);
        this.applyCreatedItem(this.roles, createdRole);
        this.clearSelection(this.selectedRoles);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Opens the edit role flow only when exactly one role is selected.
   */
  protected async onEdit(): Promise<void> {
    const selected = this.selectedRoles();

    if (selected.length !== 1) {
      return;
    }

    const role = selected[0];
    const route = this.apiRoute();

    if (!route || !role.id) {
      return;
    }

    const result = await this.modal.open<RoleListItem, IRoleModalResult>({
      component: RolesModalComponent,
      data: role,
      title: this.translate.instant('configuration.roles.update'),
      description: this.translate.instant('configuration.roles.messages.update-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.request(this.api.put<RoleMutationData>(`${route}/${role.id}`, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const updatedRole = this.extractMutationItem(res.data, this.isRoleListItem, 'role');

        if (!updatedRole) {
          this.reloadRoles();
          return;
        }

        this.handleApiSuccess(res);
        this.applyUpdatedItem(this.roles, updatedRole);
        this.selectedRoles.set([updatedRole]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Confirms and deletes the currently selected role.
   */
  protected async onDelete(): Promise<void> {
    const selected = this.selectedRoles();

    if (selected.length !== 1) {
      return;
    }

    const role = selected[0];
    const route = this.apiRoute();

    if (!route || !role.id) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.roles.delete',
      'configuration.roles.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.request(this.api.delete<unknown>(`${route}/${role.id}`)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);
        this.applyDeletedItem(this.roles, role.id);
        this.clearSelection(this.selectedRoles);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Reloads the catalog from the backend.
   *
   * Used on initial load and as a safe fallback when a response does not
   * include the created/updated entity.
   */
  protected reloadRoles(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.request(this.api.get<RolesIndexData | RoleListItem[]>(route)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const roles = Array.isArray(res.data) ? res.data : (res.data?.roles ?? []);

        this.roles.set(roles);
        this.clearSelection(this.selectedRoles);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Initializes screen metadata and performs the first catalog load.
   */
  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadRoles();
  }
}
