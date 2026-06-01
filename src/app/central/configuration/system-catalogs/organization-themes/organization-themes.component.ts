import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '../../../../shared/base/base-crud';
import { SkolansTable } from '../../../../shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { OrganizationThemesModalComponent } from '../organization-themes-modal/organization-themes-modal.component';

/**
 * Shape used by the organization themes catalog table.
 */
interface OrganizationThemeListItem {
  id: number;
  name: string;
  translation: string;
  order: number;
  active: boolean | number;
}

/**
 * Result returned by the organization theme modal after a successful submit.
 */
interface IOrganizationThemeModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string;
    order: number;
    active: boolean;
  };
}

/**
 * Data returned by the organization themes index endpoint.
 */
interface OrganizationThemesIndexData {
  organization_themes?: OrganizationThemeListItem[];
  organizationThemes?: OrganizationThemeListItem[];
}

/**
 * Flexible item payload used by create/update endpoints while backend response
 * shapes are being standardized.
 */
interface OrganizationThemeMutationData extends Partial<OrganizationThemeListItem> {
  organization_theme?: OrganizationThemeListItem;
  organizationTheme?: OrganizationThemeListItem;
  item?: OrganizationThemeListItem;
}

/**
 * Organization Themes Component
 * -----------------------------
 * Central system catalog screen used to manage organization themes.
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
 * - Load organization themes from the API.
 * - Define AG Grid columns for the catalog.
 * - Open create/edit modal flows.
 * - Persist CRUD actions through the shared API service.
 * - Keep the local table and selection state synchronized with API responses.
 */
@Component({
  selector: 'app-organization-themes',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './organization-themes.component.html',
  styleUrl: './organization-themes.component.scss',
})
export class OrganizationThemesComponent extends BaseCrud<OrganizationThemeListItem> implements OnInit {

  /** Organization themes currently loaded in the grid. */
  protected readonly organizationThemes = signal<OrganizationThemeListItem[]>([]);

  /** Currently selected rows in the grid. */
  protected readonly selectedOrganizationThemes = signal<OrganizationThemeListItem[]>([]);

  /** True when the screen currently has any selected record. */
  protected readonly hasSelection = computed(() => this.selectedOrganizationThemes().length > 0);

  /**
   * Validates whether an unknown backend payload can be used as an organization theme row.
   */
  private isOrganizationThemeListItem(value: unknown): value is OrganizationThemeListItem {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<OrganizationThemeListItem>;

    return (
      typeof candidate.id === 'number' &&
      typeof candidate.name === 'string' &&
      typeof candidate.translation === 'string' &&
      typeof candidate.order === 'number'
    );
  }

  /**
   * AG Grid column definitions for the organization themes catalog.
   */
  protected readonly columnDefs = computed<ColDef<OrganizationThemeListItem>[]>(() => [
    {
      field: 'name',
      headerValueGetter: () => this.translate.instant('configuration.organization-themes.fields.name'),
      flex: 1,
      minWidth: 180,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'translation',
      headerValueGetter: () => this.translate.instant('configuration.organization-themes.fields.translation'),
      flex: 1.25,
      minWidth: 260,
      valueGetter: (params) => {
        const key = params.data?.translation;
        return key ? this.translate.instant(key) : '';
      },
    },
    {
      field: 'active',
      headerValueGetter: () => this.translate.instant('configuration.organization-themes.fields.active'),
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
    this.selectedOrganizationThemes.set(rows as OrganizationThemeListItem[]);
  }

  /**
   * Opens the create organization theme flow.
   */
  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<Partial<OrganizationThemeListItem>, IOrganizationThemeModalResult>({
      component: OrganizationThemesModalComponent,
      data: {
        order: Number(this.organizationThemes().length),
      },
      title: this.translate.instant('configuration.organization-themes.add'),
      description: this.translate.instant('configuration.organization-themes.messages.create-description'),
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

    this.request(this.api.post<OrganizationThemeMutationData>(route, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const createdOrganizationTheme =
          this.extractMutationItem(res.data, this.isOrganizationThemeListItem, 'organization_theme') ??
          this.extractMutationItem(res.data, this.isOrganizationThemeListItem, 'organizationTheme') ??
          this.extractMutationItem(res.data, this.isOrganizationThemeListItem, 'item') ??
          (this.isOrganizationThemeListItem(res.data) ? res.data : undefined);

        if (!createdOrganizationTheme) {
          this.reloadOrganizationThemes();
          return;
        }

        this.handleApiSuccess(res);
        this.applyCreatedItem(this.organizationThemes, createdOrganizationTheme);
        this.clearSelection(this.selectedOrganizationThemes);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Opens the edit organization theme flow only when exactly one record is selected.
   */
  protected async onEdit(): Promise<void> {
    const selected = this.selectedOrganizationThemes();

    if (selected.length !== 1) {
      return;
    }

    const organizationTheme = selected[0];
    const route = this.apiRoute();

    if (!route || !organizationTheme.id) {
      return;
    }

    const result = await this.modal.open<OrganizationThemeListItem, IOrganizationThemeModalResult>({
      component: OrganizationThemesModalComponent,
      data: organizationTheme,
      title: this.translate.instant('configuration.organization-themes.update'),
      description: this.translate.instant('configuration.organization-themes.messages.update-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.request(this.api.put<OrganizationThemeMutationData>(`${route}/${organizationTheme.id}`, result.payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const updatedOrganizationTheme =
          this.extractMutationItem(res.data, this.isOrganizationThemeListItem, 'organization_theme') ??
          this.extractMutationItem(res.data, this.isOrganizationThemeListItem, 'organizationTheme') ??
          this.extractMutationItem(res.data, this.isOrganizationThemeListItem, 'item') ??
          (this.isOrganizationThemeListItem(res.data) ? res.data : undefined);

        if (!updatedOrganizationTheme) {
          this.reloadOrganizationThemes();
          return;
        }

        this.handleApiSuccess(res);
        this.applyUpdatedItem(this.organizationThemes, updatedOrganizationTheme);
        this.selectedOrganizationThemes.set([updatedOrganizationTheme]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Confirms and deletes the currently selected organization theme.
   */
  protected async onDelete(): Promise<void> {
    const selected = this.selectedOrganizationThemes();

    if (selected.length !== 1) {
      return;
    }

    const organizationTheme = selected[0];
    const route = this.apiRoute();

    if (!route || !organizationTheme.id) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.organization-themes.delete',
      'configuration.organization-themes.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.request(this.api.delete<unknown>(`${route}/${organizationTheme.id}`)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);
        this.applyDeletedItem(this.organizationThemes, organizationTheme.id);
        this.clearSelection(this.selectedOrganizationThemes);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Reloads the catalog from the backend.
   */
  protected reloadOrganizationThemes(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.request(this.api.get<OrganizationThemesIndexData | OrganizationThemeListItem[]>(route)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const organizationThemes = Array.isArray(res.data)
          ? res.data
          : res.data?.organization_themes ?? res.data?.organizationThemes ?? [];

        this.organizationThemes.set(organizationThemes);
        this.clearSelection(this.selectedOrganizationThemes);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Initializes screen metadata and performs the first catalog load.
   */
  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadOrganizationThemes();
  }
}
