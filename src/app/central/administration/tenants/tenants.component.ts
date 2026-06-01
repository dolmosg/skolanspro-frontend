import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal, Type } from '@angular/core';
import { TenantModalComponent } from '../tenant-modal/tenant-modal.component';
import { TenantLogoModalComponent } from '../tenant-logo-modal/tenant-logo-modal.component';
import { ColDef, GetRowIdParams, ValueGetterParams } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '../../../shared/base/skolans-base-component';
import { UiButtonComponent } from '../../../shared/ui/ui-button/ui-button';

import { SkolansTable } from '../../../shared/ui/skolans-table/skolans-table';
import { SklConfirmModal } from '../../../shared/base/skl-confirm-modal/skl-confirm-modal';

/**
 * Tenant status catalog record returned by the administration API.
 *
 * These values are used to determine the visual status of a tenant and
 * to enable contextual actions such as activate and suspend.
 */
interface TenantStatusCatalog {
  id: number;
  name: 'pending' | 'active' | 'suspended' | string;
  translation: string;
  color: 'warning' | 'success' | 'danger' | string;
  order: number;
  active: boolean;
}

/**
 * Catalog collections required by the tenant modal wizard.
 *
 * The index endpoint returns these catalogs together with the tenant list so
 * the modal can be opened without an additional request.
 */
interface TenantCatalogs {
  countries: any[];
  themes: any[];
  supportTypes: any[];
  passwordTypes: any[];
  languages: any[];
  captions: any[];
  tenantStatuses: TenantStatusCatalog[];
}

/** Empty catalog state used before the API response is loaded or after load errors. */
const EMPTY_TENANT_CATALOGS: TenantCatalogs = {
  countries: [],
  themes: [],
  supportTypes: [],
  passwordTypes: [],
  languages: [],
  captions: [],
  tenantStatuses: [],
};

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './tenants.component.html',
  styleUrls: ['./tenants.component.scss'],
})
/**
 * Central administration component used to manage tenants.
 *
 * Responsibilities:
 * - Load tenants and required catalogs from the API.
 * - Render tenants in the shared Skolans table.
 * - Open the tenant wizard for create and edit operations.
 * - Execute tenant lifecycle actions: activate, suspend, provision, delete,
 *   upload logo, and migrate all tenants.
 * - Keep table state synchronized using the tenant returned by the API
 *   whenever possible, avoiding unnecessary full reloads.
 */
export class TenantsComponent extends SkolansBaseComponent implements OnInit {

  /** Current tenant rows displayed in the table. */
  protected readonly tenants = signal<any[]>([]);
  /** Current table selection. The table is configured for single selection. */
  protected readonly selectedTenants = signal<any[]>([]);
  /** Catalogs used by the tenant create/edit modal. */
  protected readonly tenantCatalogs = signal<TenantCatalogs>(EMPTY_TENANT_CATALOGS);

  /** Indicates whether any tenant is currently selected. */
  protected readonly hasSelection = computed(() => this.selectedTenants().length > 0);
  /** Indicates whether exactly one tenant is selected. */
  protected readonly hasSingleSelection = computed(() => this.selectedTenants().length === 1);
  /** Enables pagination for the tenant table. */
  protected readonly tablePagination = computed(() => true);

  protected readonly columnDefs = computed<ColDef<any>[]>(() => [
    {
      field: 'id',
      headerName: this.translate.instant('administration.tenants.fields.id'),
      minWidth: 260,
      maxWidth: 320,
    },
    {
      colId: 'domain',
      headerName: this.translate.instant('administration.tenants.fields.domain'),
      flex: 1.2,
      minWidth: 220,
      valueGetter: (params: ValueGetterParams<any>) => {
        return params.data?.domains?.[0]?.domain ?? '';
      },
    },
    {
      colId: 'site_name',
      headerName: this.translate.instant('administration.tenants.fields.site_name'),
      flex: 1,
      minWidth: 200,
      valueGetter: (params: ValueGetterParams<any>) => {
        return params.data?.settings?.site_name ?? '';
      },
    },
    {
      colId: 'tenant_status',
      headerName: this.translate.instant('administration.tenants.fields.status'),
      width: 140,
      valueGetter: (params: ValueGetterParams<any>) => {
        const statusTranslation = params.data?.settings?.tenant_status?.translation;

        return statusTranslation ? this.translate.instant(statusTranslation) : '';
      },
    },
    {
      colId: 'licenses',
      headerName: this.translate.instant('administration.tenants.fields.licenses'),
      width: 120,
      valueGetter: (params: ValueGetterParams<any>) => {
        return params.data?.settings?.licenses ?? '';
      },
    },
    {
      colId: 'trade',
      headerName: this.translate.instant('administration.tenants.fields.trade'),
      flex: 1,
      minWidth: 180,
      valueGetter: (params: ValueGetterParams<any>) => {
        return params.data?.organization?.trade ?? '';
      },
    },
    {
      colId: 'theme',
      headerName: this.translate.instant('administration.tenants.fields.theme'),
      width: 130,
      valueGetter: (params: ValueGetterParams<any>) => {
        const themeTranslation = params.data?.settings?.theme?.translation;

        return themeTranslation ? this.translate.instant(themeTranslation) : '';
      },
    },
    {
      colId: 'language',
      headerName: this.translate.instant('administration.tenants.fields.language'),
      width: 150,
      valueGetter: (params: ValueGetterParams<any>) => {
        const languageTranslation = params.data?.settings?.language?.translation;

        return languageTranslation
          ? this.translate.instant(languageTranslation)
          : (params.data?.settings?.language?.label ??
              params.data?.settings?.language?.code ??
              params.data?.settings?.language?.name ??
              '');
      },
    },
    {
      colId: 'maintenance_mode',
      headerName: this.translate.instant('administration.tenants.fields.maintenance_mode'),
      width: 150,
      valueGetter: (params: ValueGetterParams<any>) => {
        return params.data?.settings?.maintenance_mode ? 'Sí' : 'No';
      },
    },
  ]);

  protected readonly getRowId = (params: GetRowIdParams<any>): string => {
    return String(params.data.id);
  };

  private async openTenantModal(data?: TenantCatalogs): Promise<void> {
    const result = await this.modal.open({
      component: TenantModalComponent as Type<unknown>,
      data,
      size: 'xl',
    });

    if (!result) {
      return;
    }

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.request(this.api.post(route, result)).subscribe({
      next: (res: any) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const tenant = res.data?.tenant;

        if (!tenant) {
          this.loadTenants();
          return;
        }

        this.handleApiSuccess(res);
        this.tenants.update((items) => [tenant, ...items]);
        this.selectedTenants.set([]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  ngOnInit(): void {
    this.initRouteMeta();
    this.loadTenants();
  }

  protected loadTenants(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.request(this.api.get(route)).subscribe({
      next: (res: any) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.setScreenOptions(res.data?.options);
        this.tenants.set(res.data?.tenants ?? []);
        this.tenantCatalogs.set({
          countries: res.data?.countries ?? [],
          themes: res.data?.themes ?? [],
          supportTypes: res.data?.supportTypes ?? [],
          passwordTypes: res.data?.passwordTypes ?? [],
          languages: res.data?.languages ?? [],
          captions: res.data?.captions ?? [],
          tenantStatuses: res.data?.tenantStatuses ?? [],
        });
        this.selectedTenants.set([]);
      },
      error: () => {
        this.tenants.set([]);
        this.tenantCatalogs.set(EMPTY_TENANT_CATALOGS);
        this.ignoreHandledRequestError();
      },
    });
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedTenants.set(rows as any[]);
  }

  protected selectedTenantIsActive(): boolean {
    const tenant = this.selectedTenants()[0];
    const statusId = tenant?.settings?.tenant_status_id ?? tenant?.settings?.tenant_status?.id;
    const statusName = tenant?.settings?.tenant_status?.name;

    return Number(statusId) === 2 || statusName === 'active';
  }

  /** Opens the tenant creation wizard. */
  async onAdd() {
    await this.openTenantModal(this.tenantCatalogs());
  }

  /**
   * Opens the tenant wizard in edit mode and updates the selected tenant.
   *
   * The modal receives the selected tenant plus the already loaded catalogs.
   */
  async onEdit(): Promise<void> {
    const tenant = this.selectedTenants()[0];
    const route = this.apiRoute();

    if (!tenant || !route) {
      return;
    }

    const result = await this.modal.open({
      component: TenantModalComponent as Type<unknown>,
      data: {
        ...this.tenantCatalogs(),
        tenant,
      },
      size: 'xl',
    });

    if (!result) {
      return;
    }

    this.request(this.api.put(`${route}/${tenant.id}`, result)).subscribe({
      next: (res: any) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const updatedTenant = res.data?.tenant;

        if (!updatedTenant) {
          this.loadTenants();
          return;
        }

        this.handleApiSuccess(res);
        this.tenants.update((items) =>
          items.map((item) => (item.id === updatedTenant.id ? updatedTenant : item)),
        );
        this.selectedTenants.set([updatedTenant]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /** Confirms and deletes the selected tenant from the API and local table. */
  async onDelete(): Promise<void> {
    const tenant = this.selectedTenants()[0];
    const route = this.apiRoute();

    if (!tenant || !route) {
      return;
    }

    const confirmed = await this.modal.open<
      {
        title: string;
        message: string;
        confirmLabel: string;
        cancelLabel: string;
        type: 'danger';
      },
      boolean
    >({
      component: SklConfirmModal,
      data: {
        title: this.translate.instant('administration.tenants.delete'),
        message: this.translate.instant('administration.tenants.messages.confirm-delete'),
        confirmLabel: this.translate.instant('common.delete'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'danger',
      },
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) {
      return;
    }

    this.request(this.api.delete(`${route}/${tenant.id}`)).subscribe({
      next: (res: any) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);
        this.tenants.update((items) => items.filter((item) => item.id !== tenant.id));
        this.selectedTenants.set([]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /** Confirms and activates the selected tenant. */
  async onActivate(): Promise<void> {
    const tenant = this.selectedTenants()[0];
    const route = this.apiRoute();

    if (!tenant || !route) {
      return;
    }

    const confirmed = await this.modal.open<
      {
        title: string;
        message: string;
        confirmLabel: string;
        cancelLabel: string;
        type: 'warning';
      },
      boolean
    >({
      component: SklConfirmModal,
      data: {
        title: this.translate.instant('administration.tenants.activate'),
        message: this.translate.instant('administration.tenants.messages.confirm-activate'),
        confirmLabel: this.translate.instant('common.activate'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'warning',
      },
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) {
      return;
    }

    this.request(this.api.put(`${route}/activate/${tenant.id}`, {})).subscribe({
      next: (res: any) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const updatedTenant = res.data?.tenant;

        if (!updatedTenant) {
          this.loadTenants();
          return;
        }

        this.handleApiSuccess(res);
        this.tenants.update((items) =>
          items.map((item) => (item.id === updatedTenant.id ? updatedTenant : item)),
        );
        this.selectedTenants.set([updatedTenant]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /** Confirms and suspends the selected tenant. */
  async onSuspend(): Promise<void> {
    const tenant = this.selectedTenants()[0];
    const route = this.apiRoute();

    if (!tenant || !route) {
      return;
    }

    const confirmed = await this.modal.open<
      {
        title: string;
        message: string;
        confirmLabel: string;
        cancelLabel: string;
        type: 'warning';
      },
      boolean
    >({
      component: SklConfirmModal,
      data: {
        title: this.translate.instant('administration.tenants.suspend'),
        message: this.translate.instant('administration.tenants.messages.confirm-suspend'),
        confirmLabel: this.translate.instant('common.suspend'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'warning',
      },
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) {
      return;
    }

    this.request(this.api.put(`${route}/suspend/${tenant.id}`, {})).subscribe({
      next: (res: any) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const updatedTenant = res.data?.tenant;

        if (!updatedTenant) {
          this.loadTenants();
          return;
        }

        this.handleApiSuccess(res);
        this.tenants.update((items) =>
          items.map((item) => (item.id === updatedTenant.id ? updatedTenant : item)),
        );
        this.selectedTenants.set([updatedTenant]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Confirms and provisions the selected tenant.
   *
   * Provisioning is a tenant lifecycle action handled by the backend.
   */
  async onProvision(): Promise<void> {
    const tenant = this.selectedTenants()[0];
    const route = this.apiRoute();

    if (!tenant || !route) {
      return;
    }

    const confirmed = await this.modal.open<
      {
        title: string;
        message: string;
        confirmLabel: string;
        cancelLabel: string;
        type: 'warning';
      },
      boolean
    >({
      component: SklConfirmModal,
      data: {
        title: this.translate.instant('administration.tenants.provision'),
        message: this.translate.instant('administration.tenants.messages.confirm-provision'),
        confirmLabel: this.translate.instant('administration.tenants.provision'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'warning',
      },
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) {
      return;
    }

    this.request(this.api.put(`${route}/provision/${tenant.id}`, {})).subscribe({
      next: (res: any) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const updatedTenant = res.data?.tenant;

        if (!updatedTenant) {
          this.loadTenants();
          return;
        }

        this.handleApiSuccess(res);
        this.tenants.update((items) =>
          items.map((item) => (item.id === updatedTenant.id ? updatedTenant : item)),
        );
        this.selectedTenants.set([updatedTenant]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Opens the tenant logo modal, receives the selected file, and uploads it.
   *
   * The file is sent as `FormData` using the `logo` field.
   */
  async onUploadLogo(): Promise<void> {
    const tenant = this.selectedTenants()[0];
    const route = this.apiRoute();

    if (!tenant || !route) {
      return;
    }

    const file = await this.modal.open<any, File | null>({
      component: TenantLogoModalComponent as Type<unknown>,
      data: { tenant },
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    this.request(this.api.post(`${route}/upload-logo/${tenant.id}`, formData)).subscribe({
      next: (res: any) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const updatedTenant = res.data?.tenant;

        if (!updatedTenant) {
          this.loadTenants();
          return;
        }

        this.handleApiSuccess(res);
        this.tenants.update((items) =>
          items.map((item) => (item.id === updatedTenant.id ? updatedTenant : item)),
        );
        this.selectedTenants.set([updatedTenant]);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /** Confirms and runs migrations for all tenants. */
  async onMigrateAll(): Promise<void> {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const confirmed = await this.modal.open<
      {
        title: string;
        message: string;
        confirmLabel: string;
        cancelLabel: string;
        type: 'warning';
      },
      boolean
    >({
      component: SklConfirmModal,
      data: {
        title: this.translate.instant('administration.tenants.migrate-all'),
        message: this.translate.instant('administration.tenants.messages.confirm-migrate-all'),
        confirmLabel: this.translate.instant('administration.tenants.migrate-all'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'warning',
      },
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) {
      return;
    }

    this.request(this.api.post(`${route}/migrate-all`, {})).subscribe({
      next: (res: any) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);
        this.loadTenants();
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }
}
