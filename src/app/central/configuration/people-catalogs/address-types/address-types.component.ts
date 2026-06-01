import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '@shared/base/base-crud';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { ScreenOptionItem } from '@shared/interfaces/configuration.interfaces';

import {
  AddressTypesModalComponent,
  IAddressTypeModalResult,
} from '../address-types-modal/address-types-modal.component';

export interface AddressTypeListItem {
  id: number;
  description: string;
  translation?: string | null;
}

interface AddressTypesIndexData {
  items?: AddressTypeListItem[];
  options?: ScreenOptionItem[];
}

interface AddressTypeMutationData {
  item?: AddressTypeListItem;
}

@Component({
  selector: 'app-address-types',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    SkolansTable,
    UiButtonComponent,
  ],
  templateUrl: './address-types.component.html',
  styleUrl: './address-types.component.scss',
})
export class AddressTypesComponent
  extends BaseCrud<AddressTypeListItem>
  implements OnInit
{
  protected readonly addressTypes = signal<AddressTypeListItem[]>([]);
  protected readonly selectedAddressTypes = signal<AddressTypeListItem[]>([]);

  protected readonly selectedAddressType = computed(
    () => this.selectedAddressTypes()[0] ?? null,
  );

  protected readonly hasSelection = computed(
    () => this.selectedAddressTypes().length > 0,
  );

  protected readonly columnDefs = computed<ColDef<AddressTypeListItem>[]>(() => [
    {
      field: 'description',
      headerValueGetter: () =>
        this.translate.instant(
          'configuration.address-types.fields.description',
        ),
      flex: 1,
      minWidth: 200,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'translation',
      headerValueGetter: () =>
        this.translate.instant(
          'configuration.address-types.fields.translation',
        ),
      flex: 1,
      minWidth: 250,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
      valueGetter: (params) => {
        const key = params.data?.translation;
        return key ? this.translate.instant(key) : '';
      },
    },
  ]);

  protected isAddressType(value: unknown): value is AddressTypeListItem {
    return (
      !!value &&
      typeof value === 'object' &&
      typeof (value as AddressTypeListItem).id === 'number' &&
      typeof (value as AddressTypeListItem).description === 'string'
    );
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedAddressTypes.set(rows as AddressTypeListItem[]);
  }

  protected async onCreate(): Promise<void> {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const result = await this.modal.open<null, IAddressTypeModalResult>({
      component: AddressTypesModalComponent,
      data: null,
      title: this.translate.instant('configuration.address-types.add'),
      description: this.translate.instant('configuration.address-types.messages.create-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.executeMutationRequest(
      this.api.post<AddressTypeMutationData>(route, result.payload),
      (res) => {
        const item =
          this.extractMutationItem(res.data, this.isAddressType, 'item') ??
          (this.isAddressType(res.data) ? res.data : undefined);

        if (!item) {
          this.reloadAddressTypes();
          return;
        }

        this.applyCreatedItem(this.addressTypes, item);
        this.clearSelection(this.selectedAddressTypes);
      },
    );
  }

  protected async onUpdate(item = this.selectedAddressType()): Promise<void> {
    const route = this.apiRoute();

    if (!route || !item) {
      return;
    }

    const result = await this.modal.open<
      AddressTypeListItem,
      IAddressTypeModalResult
    >({
      component: AddressTypesModalComponent,
      data: item,
      title: this.translate.instant('configuration.address-types.update'),
      description: this.translate.instant('configuration.address-types.messages.update-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.executeMutationRequest(
      this.api.put<AddressTypeMutationData>(`${route}/${item.id}`, result.payload),
      (res) => {
        const updated =
          this.extractMutationItem(res.data, this.isAddressType, 'item') ??
          (this.isAddressType(res.data) ? res.data : undefined);

        if (!updated) {
          this.reloadAddressTypes();
          return;
        }

        this.applyUpdatedItem(this.addressTypes, updated);
        this.selectedAddressTypes.set([updated]);
      },
    );
  }

  protected async onDelete(item = this.selectedAddressType()): Promise<void> {
    const route = this.apiRoute();

    if (!route || !item) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.address-types.actions.delete',
      'configuration.address-types.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.executeMutationRequest(
      this.api.delete(`${route}/${item.id}`),
      () => {
        this.applyDeletedItem(this.addressTypes, item.id);
        this.clearSelection(this.selectedAddressTypes);
      },
    );
  }

  protected reloadAddressTypes(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest(
      this.api.get<AddressTypesIndexData>(route),
      (res) => {
        this.addressTypes.set(res.data?.items ?? []);
        this.setScreenOptions(res.data?.options ?? []);
        this.clearSelection(this.selectedAddressTypes);
      },
      () => {
        this.addressTypes.set([]);
        this.clearSelection(this.selectedAddressTypes);
      },
    );
  }

  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadAddressTypes();
  }
}