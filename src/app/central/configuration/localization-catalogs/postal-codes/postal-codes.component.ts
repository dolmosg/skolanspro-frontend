import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '@shared/base/base-crud';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { SkolansBaseComponent } from '@shared/base/skolans-base-component';

interface PostalCodeListItem {
  id: number;
  postal_code: string;
  settlement: string;
  settlement_type: string | null;
  municipality: string;
  state: string;
  city: string | null;
  active: boolean;
}

interface PostalCodeIndexData {
  options?: Parameters<SkolansBaseComponent['setScreenOptions']>[0];
  items: PostalCodeListItem[];
}

interface PostalCodeImportData {
  imported: number;
  skipped: number;
  file: string;
}

@Component({
  selector: 'app-postal-codes',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    SkolansTable,
    UiButtonComponent,
  ],
  templateUrl: './postal-codes.component.html',
  styleUrl: './postal-codes.component.scss',
})
export class PostalCodesComponent extends BaseCrud<PostalCodeListItem> implements OnInit {
  protected readonly postalCodes = signal<PostalCodeListItem[]>([]);
  protected readonly selectedPostalCodes = signal<PostalCodeListItem[]>([]);

  protected readonly totalPostalCodes = computed(() => this.postalCodes().length);

  protected readonly columnDefs = computed<ColDef<PostalCodeListItem>[]>(() => [
    {
      field: 'postal_code',
      headerValueGetter: () => this.translate.instant('configuration.postal-codes.fields.postal-code'),
      width: 130,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'settlement',
      headerValueGetter: () => this.translate.instant('configuration.postal-codes.fields.settlement'),
      flex: 1,
      minWidth: 220,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'settlement_type',
      headerValueGetter: () => this.translate.instant('configuration.postal-codes.fields.settlement-type'),
      width: 160,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'municipality',
      headerValueGetter: () => this.translate.instant('configuration.postal-codes.fields.municipality'),
      flex: 1,
      minWidth: 180,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'city',
      headerValueGetter: () => this.translate.instant('configuration.postal-codes.fields.city'),
      flex: 1,
      minWidth: 180,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'state',
      headerValueGetter: () => this.translate.instant('configuration.postal-codes.fields.state'),
      flex: 1,
      minWidth: 180,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
  ]);

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedPostalCodes.set(rows as PostalCodeListItem[]);
  }

  protected importPostalCodes(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeMutationRequest(
      this.api.post<PostalCodeImportData>(`${route}/import`, {}),
      () => {
        this.reloadPostalCodes();
      },
    );
  }

  protected reloadPostalCodes(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest(
      this.api.get<PostalCodeIndexData>(route),
      (res) => {
        this.setScreenOptions(Array.isArray(res.data) ? undefined : res.data?.options);
        this.postalCodes.set(res.data.items ?? []);
        this.clearSelection(this.selectedPostalCodes);
      },
      () => {
        this.postalCodes.set([]);
        this.clearSelection(this.selectedPostalCodes);
      },
    );
  }

  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadPostalCodes();
  }
}