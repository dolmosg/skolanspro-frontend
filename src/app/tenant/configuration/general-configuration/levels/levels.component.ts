import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ColDef, GetRowIdParams } from 'ag-grid-community';

import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '@shared/base/base-crud';
import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import {
  LevelsModalData,
  LevelsModalResult,
  LevelsModalComponent,
} from '../levels-modal/levels-modal.component';

export interface IOrganizationLogo {
  id: number;
  name: string;
  file: string;
  default: boolean;
  active: boolean;
}

export interface ILevel {
  id: number;
  name: string;
  description: string;
  registration?: string | null;
  revoe?: string | null;
  billing?: string | null;
  css_class?: string | null;
  order: number;
  translation?: string | null;
  organization_logo_id?: number | null;
  organization_logo?: IOrganizationLogo | null;
}

interface LevelsIndexData {
  levels: ILevel[];
  children?: Parameters<SkolansBaseComponent['setScreenChildren']>[0];
  catalogs: {
    organization_logos: IOrganizationLogo[];
  };
  options?: Parameters<SkolansBaseComponent['setScreenOptions']>[0];
}

@Component({
  selector: 'app-levels',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './levels.component.html',
  styleUrl: './levels.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LevelsComponent extends BaseCrud<ILevel> implements OnInit {
  private readonly router = inject(Router);

  protected readonly levels = signal<ILevel[]>([]);
  protected readonly selectedLevels = signal<ILevel[]>([]);
  protected readonly orderingMode = signal(false);
  protected readonly savingOrder = signal(false);

  protected readonly tablePagination = computed(() => !this.orderingMode());

  protected readonly getRowId = (params: GetRowIdParams<ILevel>): string => {
    return String(params.data.id);
  };

  protected readonly catalogs = signal<{
    organization_logos: IOrganizationLogo[];
  }>({
    organization_logos: [],
  });

  protected readonly hasLevels = computed(() => this.levels().length > 0);
  protected readonly hasSelection = computed(() => this.selectedLevels().length > 0);
  protected readonly hasSingleSelection = computed(() => this.selectedLevels().length === 1);
  protected readonly originalLevelsOrder = signal<ILevel[]>([]);

  protected readonly columnDefs = computed<ColDef<ILevel>[]>(() => {
    const ordering = this.orderingMode();

    const columns: ColDef<ILevel>[] = [
      {
        field: 'name',
        headerValueGetter: () => this.translate.instant('configuration.levels.fields.name'),
        flex: 1,
        minWidth: 180,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'description',
        headerValueGetter: () => this.translate.instant('configuration.levels.fields.description'),
        flex: 1,
        minWidth: 220,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'registration',
        headerValueGetter: () => this.translate.instant('configuration.levels.fields.registration'),
        minWidth: 150,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'revoe',
        headerValueGetter: () => this.translate.instant('configuration.levels.fields.revoe'),
        minWidth: 140,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        field: 'billing',
        headerValueGetter: () => this.translate.instant('configuration.levels.fields.billing'),
        minWidth: 140,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
      },
      {
        headerValueGetter: () =>
          this.translate.instant('configuration.levels.fields.organization-logo'),
        valueGetter: (params) => params.data?.organization_logo?.name ?? '',
        minWidth: 200,
        sortable: !ordering,
        filter: ordering ? false : 'agTextColumnFilter',
        floatingFilter: !ordering,
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
    this.reloadLevels();
  }

  protected reloadLevels(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest<LevelsIndexData>(this.api.get(route), (res) => {
      this.levels.set(res.data.levels ?? []);
      this.setScreenChildren(res.data.children);
      this.setScreenOptions(res.data.options);

      this.catalogs.set({
        organization_logos: res.data.catalogs?.organization_logos ?? [],
      });

      this.clearSelection(this.selectedLevels);
    });
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedLevels.set(rows as ILevel[]);
  }

  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<LevelsModalData, LevelsModalResult>({
      component: LevelsModalComponent,
      data: {
        level: null,
        organization_logos: this.catalogs().organization_logos,
      },
      title: this.translate.instant('configuration.levels.add'),
      description: this.translate.instant('configuration.levels.messages.create-description'),
      size: 'lg',
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
      order: this.levels().length,
    };

    this.executeMutationRequest<{ level: ILevel }>(this.api.post(route, payload), (res) => {
      const createdLevel = res.data.level;

      if (!createdLevel) {
        this.reloadLevels();
        return;
      }

      this.applyCreatedItem(this.levels, createdLevel);
      this.clearSelection(this.selectedLevels);
    });
  }

  protected async onEdit(): Promise<void> {
    const level = this.selectedLevels()[0];

    if (!level) {
      return;
    }

    const result = await this.modal.open<LevelsModalData, LevelsModalResult>({
      component: LevelsModalComponent,
      data: {
        level,
        organization_logos: this.catalogs().organization_logos,
      },
      title: this.translate.instant('configuration.levels.update'),
      description: this.translate.instant('configuration.levels.messages.update-description'),
      size: 'lg',
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

    this.executeMutationRequest<{ level: ILevel }>(
      this.api.put(`${route}/${level.id}`, result.payload),
      (res) => {
        const updatedLevel = res.data.level;

        if (!updatedLevel) {
          this.reloadLevels();
          return;
        }

        this.applyUpdatedItem(this.levels, updatedLevel);
        this.selectedLevels.set([updatedLevel]);
      },
    );
  }

  protected async onDelete(): Promise<void> {
    const level = this.selectedLevels()[0];

    if (!level) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.levels.delete',
      'configuration.levels.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeMutationRequest<unknown>(this.api.delete(`${route}/${level.id}`), () => {
      this.applyDeletedItem(this.levels, level.id);
      this.clearSelection(this.selectedLevels);
    });
  }

  protected openGrades(level: ILevel): void {
    if (!this.hasScreenChild('grades')) {
      return;
    }

    this.router.navigate([level.id, 'grades'], {
      relativeTo: this.activatedRoute,
    });
  }

  protected startOrdering(): void {
    this.originalLevelsOrder.set([...this.levels()]);
    this.clearSelection(this.selectedLevels);
    this.orderingMode.set(true);
  }

  protected cancelOrdering(): void {
    this.levels.set([...this.originalLevelsOrder()]);
    this.originalLevelsOrder.set([]);
    this.orderingMode.set(false);
  }

  protected onRowOrderChange(rows: unknown[]): void {
    const ordered = rows as ILevel[];

    this.levels.set(
      ordered.map((level, index) => ({
        ...level,
        order: index,
      })),
    );
  }

  protected saveOrder(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const payload = {
      levels: this.levels().map((level, index) => ({
        id: level.id,
        order: index,
      })),
    };

    this.savingOrder.set(true);

    this.executeSilentRequest<{ levels: ILevel[] }>(
      this.api.put(`${route}/order`, payload),
      (res) => {
        this.handleApiSuccess(res);

        this.levels.set(res.data.levels ?? this.levels());
        this.originalLevelsOrder.set([]);
        this.orderingMode.set(false);
        this.savingOrder.set(false);
        this.clearSelection(this.selectedLevels);
      },
      () => {
        this.savingOrder.set(false);
      },
    );
  }
}
