import { Component, OnInit, computed, input, signal } from '@angular/core';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type { IStudyPlanAspect } from '@shared/interfaces/study-plan-interfaces';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

interface StudyPlanAspectsCatalogPayload {
  options: ScreenOptionItem[];
  aspects: IStudyPlanAspect[];
  unused: number[];
  programming_aspect_id: number | null;
}

interface StudyPlanAspectCatalogItem extends IStudyPlanAspect {
  is_programming: boolean;
}

type AspectCatalogFilter = 'all' | 'unused';

@Component({
  selector: 'app-study-plan-aspects-catalog',
  imports: [SkolansTable, TranslatePipe, UiButtonComponent],
  templateUrl: './study-plan-aspects-catalog.component.html',
  styleUrl: './study-plan-aspects-catalog.component.scss',
})
export class StudyPlanAspectsCatalogComponent extends SkolansBaseComponent implements OnInit {
  readonly studyPlanId = input.required<number>();
  readonly route = input.required<string>();

  protected readonly aspects = signal<IStudyPlanAspect[]>([]);
  protected readonly unusedAspectIds = signal<Set<number>>(new Set());
  protected readonly programmingAspectId = signal<number | null>(null);
  protected readonly selectedAspect = signal<IStudyPlanAspect | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly activeFilter = signal<AspectCatalogFilter>('all');

  protected readonly catalogItems = computed<StudyPlanAspectCatalogItem[]>(() =>
    this.aspects().map((aspect) => ({
      ...aspect,
      is_programming: aspect.id === this.programmingAspectId(),
    })),
  );
  protected readonly filteredAspects = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase();
    const unusedIds = this.unusedAspectIds();

    const filteredByType =
      this.activeFilter() === 'unused'
        ? this.catalogItems().filter((aspect) => unusedIds.has(aspect.id))
        : this.catalogItems();

    if (!term) {
      return filteredByType;
    }

    return filteredByType.filter(
      (aspect) =>
        aspect.name.toLocaleLowerCase().includes(term) ||
        aspect.description?.toLocaleLowerCase().includes(term),
    );
  });
  protected readonly tablePagination = computed(() => this.filteredAspects().length > 10);

  protected readonly getRowId = (params: { data: StudyPlanAspectCatalogItem }) =>
    String(params.data.id);

  protected readonly columnDefs = computed<ColDef<StudyPlanAspectCatalogItem>[]>(() => [
    {
      field: 'name',
      headerValueGetter: () =>
        this.translate.instant('planning.study-plan-aspects.columns.name'),
      flex: 1,
      minWidth: 180,
    },
    {
      field: 'description',
      headerValueGetter: () =>
        this.translate.instant('planning.study-plan-aspects.columns.description'),
      flex: 2,
      minWidth: 240,
      valueFormatter: (params) =>
        params.value || this.translate.instant('planning.study-plan-aspects.no-description'),
    },
    {
      field: 'is_programming',
      headerValueGetter: () =>
        this.translate.instant('planning.study-plan-aspects.columns.programming'),
      width: 150,
      minWidth: 150,
      cellRenderer: (params: ICellRendererParams<StudyPlanAspectCatalogItem>) => {
        const active = params.data?.is_programming === true;
        const label = this.translate.instant(
          active
            ? 'planning.study-plan-aspects.programming.yes'
            : 'planning.study-plan-aspects.programming.no',
        );
        const background = active ? 'var(--color-success-soft)' : 'var(--color-surface-muted)';
        const color = active ? 'var(--color-success)' : 'var(--color-text-muted)';

        return `<span style="display:inline-flex;align-items:center;padding:0.15rem 0.55rem;border-radius:999px;background:${background};color:${color};font-size:0.75rem;font-weight:700;">${label}</span>`;
      },
    },
  ]);

  ngOnInit(): void {
    this.loadAspects();
  }

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    this.searchTerm.set(value);

    const selected = this.selectedAspect();

    if (selected && !this.filteredAspects().some((aspect) => aspect.id === selected.id)) {
      this.selectedAspect.set(null);
    }
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedAspect.set((rows[0] as IStudyPlanAspect | undefined) ?? null);
  }

  protected selectFilter(filter: AspectCatalogFilter): void {
    this.activeFilter.set(filter);
    this.searchTerm.set('');
    this.selectedAspect.set(null);
  }

  private loadAspects(): void {
    this.executeSilentRequest<StudyPlanAspectsCatalogPayload>(
      this.api.get(`${this.route()}/${this.studyPlanId()}`),
      (response) => {
        this.aspects.set(response.data.aspects);
        this.unusedAspectIds.set(new Set(response.data.unused));
        this.programmingAspectId.set(response.data.programming_aspect_id);
        this.selectedAspect.set(null);
        this.setScreenOptions(response.data.options);
      },
    );
  }
}
