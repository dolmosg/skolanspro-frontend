import { ChangeDetectionStrategy, Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef, GetRowIdParams } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '@shared/base/base-crud';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import {
  SectionsModalComponent,
  SectionsModalData,
  SectionsModalResult,
} from '../sections-modal/sections-modal.component';

export interface ISection {
  id: number;
  name: string;
  description?: string | null;
  css_class?: string | null;
  order: number;
  active: boolean;
  translation?: string | null;
  capital: string;
  gender_id?: number | null;
}

export interface ISectionGender {
  id: number;
  name: string;
  description?: string | null;
  translation?: string | null;
}

interface SectionsIndexData {
  sections: ISection[];
  catalogs?: {
    genders?: ISectionGender[];
  };
  options?: Parameters<BaseCrud<ISection>['setScreenOptions']>[0];
}

@Component({
  selector: 'app-sections',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './sections.component.html',
  styleUrl: './sections.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionsComponent extends BaseCrud<ISection> implements OnInit {
  protected readonly sections = signal<ISection[]>([]);
  protected readonly selectedSections = signal<ISection[]>([]);

  protected readonly orderingMode = signal(false);
  protected readonly savingOrder = signal(false);
  protected readonly originalSectionsOrder = signal<ISection[]>([]);
  protected readonly catalogs = signal<{
    genders: ISectionGender[];
  }>({
    genders: [],
  });

  protected readonly tablePagination = computed(() => !this.orderingMode());

  protected readonly hasSections = computed(() => this.sections().length > 0);
  protected readonly hasSelection = computed(() => this.selectedSections().length > 0);
  protected readonly hasSingleSelection = computed(() => this.selectedSections().length === 1);

  protected readonly getRowId = (params: GetRowIdParams<ISection>): string => {
    return String(params.data.id);
  };

  protected readonly columnDefs = computed<ColDef<ISection>[]>(() => {
    const ordering = this.orderingMode();

    const columns: ColDef<ISection>[] = [
      {
        field: 'name',
        headerValueGetter: () => this.translate.instant('configuration.sections.fields.name'),
        flex: 1,
        minWidth: 160,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'description',
        headerValueGetter: () =>
          this.translate.instant('configuration.sections.fields.description'),
        flex: 1,
        minWidth: 220,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'capital',
        headerValueGetter: () => this.translate.instant('configuration.sections.fields.capital'),
        width: 120,
        minWidth: 120,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'active',
        headerValueGetter: () => this.translate.instant('configuration.sections.fields.active'),
        width: 140,
        minWidth: 140,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
        valueGetter: (params) =>
          params.data?.active
            ? this.translate.instant('common.yes')
            : this.translate.instant('common.no'),
        filterValueGetter: (params) =>
          params.data?.active
            ? this.translate.instant('common.yes')
            : this.translate.instant('common.no'),
      },
    ];

    if (!ordering) {
      return columns;
    }

    return [
      {
        colId: 'drag',
        headerName: '',
        width: 56,
        minWidth: 56,
        maxWidth: 56,
        sortable: false,
        filter: false,
        suppressMenu: true,
        suppressMovable: true,
        rowDrag: true,
      },
      ...columns,
    ];
  });

  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadSections();
  }

  protected reloadSections(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest<SectionsIndexData>(this.api.get(route), (res) => {
      this.sections.set(res.data.sections ?? []);

      this.catalogs.set({
        genders: res.data.catalogs?.genders ?? [],
      });

      this.setScreenOptions(res.data.options);
      this.clearSelection(this.selectedSections);
    });
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedSections.set(rows as ISection[]);
  }

  protected startOrdering(): void {
    this.originalSectionsOrder.set([...this.sections()]);
    this.clearSelection(this.selectedSections);
    this.orderingMode.set(true);
  }

  protected cancelOrdering(): void {
    this.sections.set([...this.originalSectionsOrder()]);
    this.originalSectionsOrder.set([]);
    this.orderingMode.set(false);
    this.savingOrder.set(false);
  }

  protected onRowOrderChange(rows: unknown[]): void {
    const ordered = rows as ISection[];

    this.sections.set(
      ordered.map((section, index) => ({
        ...section,
        order: index,
      })),
    );
  }

  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<SectionsModalData, SectionsModalResult>({
      component: SectionsModalComponent,
      data: {
        section: null,
        genders: this.catalogs().genders,
      },
      title: this.translate.instant('configuration.sections.add'),
      description: this.translate.instant('configuration.sections.messages.create-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved || !result.payload) {
      return;
    }

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const payload = {
      ...result.payload,
      order: this.sections().length,
    };

    this.executeMutationRequest<{ section: ISection }>(this.api.post(route, payload), (res) => {
      const createdSection = res.data.section;

      if (!createdSection) {
        this.reloadSections();
        return;
      }

      this.applyCreatedItem(this.sections, createdSection);
      this.clearSelection(this.selectedSections);
    });
  }

  protected async onEdit(): Promise<void> {
    const section = this.selectedSections()[0];

    if (!section) {
      return;
    }

    const result = await this.modal.open<SectionsModalData, SectionsModalResult>({
      component: SectionsModalComponent,
      data: {
        section,
        genders: this.catalogs().genders,
      },
      title: this.translate.instant('configuration.sections.update'),
      description: this.translate.instant('configuration.sections.messages.update-description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved || !result.payload) {
      return;
    }

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeMutationRequest<{ section: ISection }>(
      this.api.put(`${route}/${section.id}`, result.payload),
      (res) => {
        const updatedSection = res.data.section;

        if (!updatedSection) {
          this.reloadSections();
          return;
        }

        this.applyUpdatedItem(this.sections, updatedSection);
        this.selectedSections.set([updatedSection]);
      },
    );
  }

  protected async onDelete(): Promise<void> {
    const section = this.selectedSections()[0];

    if (!section) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.sections.delete',
      'configuration.sections.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeMutationRequest<unknown>(this.api.delete(`${route}/${section.id}`), () => {
      this.applyDeletedItem(this.sections, section.id);
      this.clearSelection(this.selectedSections);
    });
  }

  protected saveOrder(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const payload = {
      sections: this.sections().map((section, index) => ({
        id: section.id,
        order: index,
      })),
    };

    this.savingOrder.set(true);

    this.executeSilentRequest<{ sections: ISection[] }>(
      this.api.put(`${route}/order`, payload),
      (res) => {
        this.handleApiSuccess(res);

        this.sections.set(res.data.sections ?? this.sections());
        this.originalSectionsOrder.set([]);
        this.orderingMode.set(false);
        this.savingOrder.set(false);
        this.clearSelection(this.selectedSections);
      },
      () => {
        this.savingOrder.set(false);
      },
    );
  }
}
