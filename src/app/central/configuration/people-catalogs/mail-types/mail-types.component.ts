import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '../../../../shared/base/base-crud';
import { SkolansTable } from '../../../../shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { ScreenOptionItem } from '../../../../shared/interfaces/access.interfaces';
import { MailTypeModalComponent, IMailTypeModalResult } from '../mail-type-modal/mail-type-modal.component';



export interface MailTypeListItem {
  id: number;
  description: string;
  translation?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface MailTypesIndexData {
  items?: MailTypeListItem[];
  options?: ScreenOptionItem[];
}

interface MailTypeMutationData {
  item?: MailTypeListItem;
}

/**
 * Central people catalog screen for managing mail types.
 *
 * This component follows the standard SkolansPro CRUD catalog pattern:
 * - Extends BaseCrud.
 * - Owns local state through signals.
 * - Loads records with executeSilentRequest().
 * - Creates, updates and deletes records with executeMutationRequest().
 * - Uses backend-provided options to control visible actions.
 * - Updates local state through BaseCrud helpers.
 */
@Component({
  selector: 'app-mail-types',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    SkolansTable,
    UiButtonComponent,
  ],
  templateUrl: './mail-types.component.html',
  styleUrl: './mail-types.component.scss',
})
export class MailTypesComponent
  extends BaseCrud<MailTypeListItem>
  implements OnInit
{
  protected readonly mailTypes = signal<MailTypeListItem[]>([]);
  protected readonly selectedMailTypes = signal<MailTypeListItem[]>([]);

  protected readonly selectedMailType = computed(
    () => this.selectedMailTypes()[0] ?? null,
  );

  protected readonly hasSelection = computed(
    () => this.selectedMailTypes().length > 0,
  );

  protected readonly columnDefs = computed<ColDef<MailTypeListItem>[]>(() => [
    {
      field: 'description',
      headerValueGetter: () =>
        this.translate.instant('configuration.mail-types.fields.description'),
      flex: 1,
      minWidth: 180,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'translation',
      headerValueGetter: () =>
        this.translate.instant('configuration.mail-types.fields.translation'),
      flex: 1,
      minWidth: 220,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
      valueGetter: (params) => {
          const key = params.data?.translation;
          return key ? this.translate.instant(key) : '';
        },
    },
  ]);

  protected isMailTypeListItem(value: unknown): value is MailTypeListItem {
    return (
      !!value &&
      typeof value === 'object' &&
      typeof (value as MailTypeListItem).id === 'number' &&
      typeof (value as MailTypeListItem).description === 'string'
    );
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedMailTypes.set(rows as MailTypeListItem[]);
  }

  protected async onCreate(): Promise<void> {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const result = await this.modal.open<Partial<MailTypeListItem>, IMailTypeModalResult>({
      component: MailTypeModalComponent,
      data: {},
      title: this.translate.instant('configuration.mail-types.add'),
      description: this.translate.instant(
        'configuration.mail-types.messages.create-description',
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
      this.api.post<MailTypeMutationData>(route, result.payload),
      (res) => {
        const createdMailType =
          this.extractMutationItem(res.data, this.isMailTypeListItem, 'item') ??
          (this.isMailTypeListItem(res.data) ? res.data : undefined);

        if (!createdMailType) {
          this.reloadMailTypes();
          return;
        }

        this.applyCreatedItem(this.mailTypes, createdMailType);
        this.clearSelection(this.selectedMailTypes);
      },
    );
  }

  protected async onUpdate(mailType = this.selectedMailType()): Promise<void> {
    const route = this.apiRoute();

    if (!route || !mailType) {
      return;
    }

    const result = await this.modal.open<MailTypeListItem, IMailTypeModalResult>({
      component: MailTypeModalComponent,
      data: mailType,
      title: this.translate.instant('configuration.mail-types.update'),
      description: this.translate.instant(
        'configuration.mail-types.messages.update-description',
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
      this.api.put<MailTypeMutationData>(`${route}/${mailType.id}`, result.payload),
      (res) => {
        const updatedMailType =
          this.extractMutationItem(res.data, this.isMailTypeListItem, 'item') ??
          (this.isMailTypeListItem(res.data) ? res.data : undefined);

        if (!updatedMailType) {
          this.reloadMailTypes();
          return;
        }

        this.applyUpdatedItem(this.mailTypes, updatedMailType);
        this.selectedMailTypes.set([updatedMailType]);
      },
    );
  }

  protected async onDelete(mailType = this.selectedMailType()): Promise<void> {
    const route = this.apiRoute();

    if (!route || !mailType) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.mail-types.actions.delete',
      'configuration.mail-types.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.executeMutationRequest(
      this.api.delete<unknown>(`${route}/${mailType.id}`),
      () => {
        this.applyDeletedItem(this.mailTypes, mailType.id);
        this.clearSelection(this.selectedMailTypes);
      },
    );
  }

  protected reloadMailTypes(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest(
      this.api.get<MailTypesIndexData | MailTypeListItem[]>(route),
      (res) => {
        const mailTypes = Array.isArray(res.data)
          ? res.data
          : res.data?.items ?? [];

        const options = Array.isArray(res.data)
          ? []
          : res.data?.options ?? [];

        this.mailTypes.set(mailTypes);
        this.setScreenOptions(options);
        this.clearSelection(this.selectedMailTypes);
      },
      () => {
        this.mailTypes.set([]);
        this.clearSelection(this.selectedMailTypes);
      },
    );
  }

  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadMailTypes();
  }

  protected readonly tablePagination = computed(() => true);
}