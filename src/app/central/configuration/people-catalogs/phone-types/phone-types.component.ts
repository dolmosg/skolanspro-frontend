import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '@shared/base/base-crud';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { ScreenOptionItem } from '@shared/interfaces/access.interfaces';

import {
  PhoneTypesModalComponent,
  IPhoneTypeModalResult,
} from '../phone-types-modal/phone-types-modal.component';

export interface PhoneTypeListItem {
  id: number;
  description: string;
  translation?: string | null;
}

interface PhoneTypesIndexData {
  items?: PhoneTypeListItem[];
  options?: ScreenOptionItem[];
}

interface PhoneTypeMutationData {
  item?: PhoneTypeListItem;
}

@Component({
  selector: 'app-phone-types',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    SkolansTable,
    UiButtonComponent,
  ],
  templateUrl: './phone-types.component.html',
  styleUrl: './phone-types.component.scss',
})
export class PhoneTypesComponent
  extends BaseCrud<PhoneTypeListItem>
  implements OnInit
{
  protected readonly phoneTypes = signal<PhoneTypeListItem[]>([]);
  protected readonly selectedPhoneTypes = signal<PhoneTypeListItem[]>([]);

  protected readonly selectedPhoneType = computed(
    () => this.selectedPhoneTypes()[0] ?? null,
  );

  protected readonly hasSelection = computed(
    () => this.selectedPhoneTypes().length > 0,
  );

  protected readonly columnDefs = computed<ColDef<PhoneTypeListItem>[]>(() => [
    {
      field: 'description',
      headerValueGetter: () =>
        this.translate.instant('configuration.phone-types.fields.description'),
      flex: 1,
      minWidth: 200,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'translation',
      headerValueGetter: () =>
        this.translate.instant('configuration.phone-types.fields.translation'),
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

  protected isPhoneType(value: unknown): value is PhoneTypeListItem {
    return (
      !!value &&
      typeof value === 'object' &&
      typeof (value as PhoneTypeListItem).id === 'number' &&
      typeof (value as PhoneTypeListItem).description === 'string'
    );
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedPhoneTypes.set(rows as PhoneTypeListItem[]);
  }

  protected async onCreate(): Promise<void> {
    const route = this.apiRoute();
    if (!route) return;

    const result = await this.modal.open<null, IPhoneTypeModalResult>({
      component: PhoneTypesModalComponent,
      data: null,
      title: this.translate.instant('configuration.phone-types.add'),
      description: this.translate.instant('configuration.phone-types.messages.create-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) return;

    this.executeMutationRequest(
      this.api.post<PhoneTypeMutationData>(route, result.payload),
      (res) => {
        const item =
          this.extractMutationItem(res.data, this.isPhoneType, 'item') ??
          (this.isPhoneType(res.data) ? res.data : undefined);

        if (!item) {
          this.reloadPhoneTypes();
          return;
        }

        this.applyCreatedItem(this.phoneTypes, item);
        this.clearSelection(this.selectedPhoneTypes);
      },
    );
  }

  protected async onUpdate(item = this.selectedPhoneType()): Promise<void> {
    const route = this.apiRoute();
    if (!route || !item) return;

    const result = await this.modal.open<
      PhoneTypeListItem,
      IPhoneTypeModalResult
    >({
      component: PhoneTypesModalComponent,
      data: item,
      title: this.translate.instant('configuration.phone-types.update'),
      description: this.translate.instant('configuration.phone-types.messages.update-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) return;

    this.executeMutationRequest(
      this.api.put<PhoneTypeMutationData>(`${route}/${item.id}`, result.payload),
      (res) => {
        const updated =
          this.extractMutationItem(res.data, this.isPhoneType, 'item') ??
          (this.isPhoneType(res.data) ? res.data : undefined);

        if (!updated) {
          this.reloadPhoneTypes();
          return;
        }

        this.applyUpdatedItem(this.phoneTypes, updated);
        this.selectedPhoneTypes.set([updated]);
      },
    );
  }

  protected async onDelete(item = this.selectedPhoneType()): Promise<void> {
    const route = this.apiRoute();
    if (!route || !item) return;

    const confirmed = await this.confirmDelete(
      'configuration.phone-types.actions.delete',
      'configuration.phone-types.messages.confirm-delete',
    );

    if (!confirmed) return;

    this.executeMutationRequest(
      this.api.delete(`${route}/${item.id}`),
      () => {
        this.applyDeletedItem(this.phoneTypes, item.id);
        this.clearSelection(this.selectedPhoneTypes);
      },
    );
  }

  protected reloadPhoneTypes(): void {
    const route = this.apiRoute();
    if (!route) return;

    this.executeSilentRequest(
      this.api.get<PhoneTypesIndexData>(route),
      (res) => {
        this.phoneTypes.set(res.data?.items ?? []);
        this.setScreenOptions(res.data?.options ?? []);
        this.clearSelection(this.selectedPhoneTypes);
      },
      () => {
        this.phoneTypes.set([]);
        this.clearSelection(this.selectedPhoneTypes);
      },
    );
  }

  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadPhoneTypes();
  }
}