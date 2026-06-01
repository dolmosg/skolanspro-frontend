import { Component, computed, OnInit, signal } from '@angular/core';
import { TranslateModule, TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { ColDef, GetRowIdParams } from 'ag-grid-community';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import {
  CommunityModalComponent,
  ICommunityModalData,
  ICommunityModalResult,
} from '../community-modal/community-modal.component';

interface CommunityCatalogRouteData {
  apiRoute: string;
  collectionKey: string;
  itemKey: string;
  title: string;
}

interface CommunityCatalogItem {
  id: number;
  name: string;
  translation: string | null;
  css_class: string;
  active: boolean;
  order: number;
}

@Component({
  selector: 'app-community-catalog',
  standalone: true,
  imports: [TranslateModule, TranslatePipe, UiButtonComponent, SkolansTable],
  templateUrl: './community-catalog.component.html',
  styleUrl: './community-catalog.component.scss',
})
export class CommunityCatalogComponent extends SkolansBaseComponent implements OnInit {
  catalog = signal<CommunityCatalogItem[]>([]);
  config = signal<CommunityCatalogRouteData | null>(null);

  title = computed(() => this.config()?.title ?? '');
  itemsCount = computed(() => this.catalog().length);

  selectedItems = signal<CommunityCatalogItem[]>([]);

  hasSelection = computed(() => this.selectedItems().length > 0);
  hasSingleSelection = computed(() => this.selectedItems().length === 1);
  tablePagination = computed(() => this.catalog().length > 10);

  onSelectionChange(selection: unknown[]): void {
    this.selectedItems.set(selection as CommunityCatalogItem[]);
  }

  protected readonly columnDefs = computed<ColDef<CommunityCatalogItem>[]>(() => [
    {
      headerName: this.translate.instant('configuration.community-catalogs.fields.name'),
      field: 'name',
      flex: 1,
      minWidth: 180,
    },
    {
      headerName: this.translate.instant('configuration.community-catalogs.fields.translation'),
      field: 'translation',
      flex: 1,
      minWidth: 220,
      valueGetter: (params) => {
        const key = params.data?.translation;
        return key ? this.translate.instant(key) : '';
      },
    },
    {
  headerName: this.translate.instant('configuration.community-catalogs.fields.css-class'),
  field: 'css_class',
  flex: 1,
  minWidth: 160,
  cellRenderer: (params: { value?: string }) => {
    const value = params.value ?? 'secondary';

    return `
      <span class="community-catalog-color">
        <span
          class="community-catalog-color__dot"
          style="background: var(--color-${value}, var(--color-text-muted));"
        ></span>
        <span>${value}</span>
      </span>
    `;
  },
},
    {
      headerName: this.translate.instant('configuration.community-catalogs.fields.active'),
      field: 'active',
      width: 130,
      valueGetter: (params) =>
        params.data?.active
          ? this.translate.instant('common.yes')
          : this.translate.instant('common.no'),
    },
  ]);

  getRowId = (params: GetRowIdParams): string => {
    return String(params.data.id);
  };

  onRowClicked(row: unknown): void {
    // Opcional por ahora
  }

  ngOnInit(): void {
    this.initRouteMeta();
    const route = this.apiRoute();

    if (!route) {
      return;
    }
    const data = this.activatedRoute.snapshot.data as CommunityCatalogRouteData;

    this.config.set({
      apiRoute: route,
      collectionKey: data.collectionKey,
      itemKey: data.itemKey,
      title: data.title,
    });

    this.loadCatalog();
  }

  loadCatalog(): void {
    const config = this.config();

    if (!config) {
      return;
    }

    this.executeSilentRequest<any>(
      this.api.get(config.apiRoute),
      (response) => {
        this.catalog.set(response.data?.[config.collectionKey] ?? []);
        this.setScreenOptions(Array.isArray(response.data) ? undefined : response.data?.options);
      },
      () => {
        this.catalog.set([]);
        this.setScreenOptions([]);
      },
    );
  }

  protected async openCreateModal(): Promise<void> {
    const config = this.config();

    if (!config) {
      return;
    }

    const result = await this.modal.open<ICommunityModalData, ICommunityModalResult>({
      component: CommunityModalComponent,
      data: {
        title: config.title,
        collectionKey: config.collectionKey,
        item: null,
      },
      title: this.translate.instant(config.title),
      description: this.translate.instant(
        'configuration.community-catalogs.messages.create-description',
      ),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.executeMutationRequest(this.api.post(config.apiRoute, result.payload), (response) => {
      const data = response.data as Record<string, unknown>;

      const createdItem = data?.[config.itemKey] ?? data?.['item'] ?? data;

      if (!createdItem) {
        this.loadCatalog();
        return;
      }

      this.catalog.update((items) => [...items, createdItem as CommunityCatalogItem]);

      this.selectedItems.set([]);
    });
  }

  protected async openEditModal(item: CommunityCatalogItem): Promise<void> {
    const config = this.config();

    if (!config) {
      return;
    }

    const result = await this.modal.open<ICommunityModalData, ICommunityModalResult>({
      component: CommunityModalComponent,
      data: {
        title: config.title,
        collectionKey: config.collectionKey,
        item,
      },
      title: this.translate.instant(config.title),
      description: this.translate.instant(
        'configuration.community-catalogs.messages.edit-description',
      ),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.executeMutationRequest(
      this.api.put(`${config.apiRoute}/${item.id}`, result.payload),
      (response) => {
        const data = response.data as Record<string, unknown>;

        const updatedItem = data?.[config.itemKey] ?? data?.['item'] ?? data;

        if (!updatedItem) {
          this.loadCatalog();
          return;
        }

        this.catalog.update((items) =>
          items.map((catalogItem) =>
            catalogItem.id === item.id ? (updatedItem as CommunityCatalogItem) : catalogItem,
          ),
        );

        this.selectedItems.set([]);
      },
    );
  }

  deleteItem(item: CommunityCatalogItem): void {
    const config = this.config();

    if (!config) {
      return;
    }

    // const modalRef = this.modal.open(SklConfirmModal, {
    //   title: 'general.confirm-delete-title',
    //   message: 'general.confirm-delete-message',
    //   confirmLabel: 'general.delete',
    //   cancelLabel: 'general.cancel',
    //   confirmVariant: 'danger',
    // });

    // modalRef.closed.subscribe((confirmed) => {
    //   if (!confirmed) {
    //     return;
    //   }

    //   this.executeMutationRequest<any>(
    //     this.api.delete(`${config.apiRoute}/${item.id}`),
    //     () => {
    //       this.catalog.update((items) =>
    //         items.filter((catalogItem) => catalogItem.id !== item.id)
    //       );
    //     }
    //   );
    // });
  }

  trackById(_: number, item: CommunityCatalogItem): number {
    return item.id;
  }
}
