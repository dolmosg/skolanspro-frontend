import { ChangeDetectionStrategy, Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef, GetRowIdParams } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '@shared/base/base-crud';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

export interface IGradeProgressionLevel {
  id: number;
  name: string;
  description: string;
}

export interface IGradeProgression {
  id: number;
  name: string;
  description: string;
  order: number;
  active: boolean;
  level_id: number;
  level?: IGradeProgressionLevel | null;
}

interface GradeProgressionsIndexData {
  grades: IGradeProgression[];
  options?: Parameters<BaseCrud<IGradeProgression>['setScreenOptions']>[0];
}

@Component({
  selector: 'app-grade-progressions',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './grade-progressions.component.html',
  styleUrl: './grade-progressions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradeProgressionsComponent extends BaseCrud<IGradeProgression> implements OnInit {
  protected readonly grades = signal<IGradeProgression[]>([]);
  protected readonly originalGradesOrder = signal<IGradeProgression[]>([]);
  protected readonly savingOrder = signal(false);

  protected readonly hasGrades = computed(() => this.grades().length > 0);

  protected readonly getRowId = (params: GetRowIdParams<IGradeProgression>): string => {
    return String(params.data.id);
  };

  protected readonly columnDefs = computed<ColDef<IGradeProgression>[]>(() => [
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
    {
      field: 'name',
      headerValueGetter: () => this.translate.instant('configuration.grades.fields.name'),
      flex: 1,
      minWidth: 180,
      sortable: false,
      filter: false,
      floatingFilter: false,
    },
    {
      field: 'description',
      headerValueGetter: () => this.translate.instant('configuration.grades.fields.description'),
      flex: 1,
      minWidth: 220,
      sortable: false,
      filter: false,
      floatingFilter: false,
    },
    {
      headerValueGetter: () => this.translate.instant('configuration.grades.fields.level'),
      valueGetter: (params) => params.data?.level?.description ?? '',
      flex: 1,
      minWidth: 180,
      sortable: false,
      filter: false,
      floatingFilter: false,
    },
  ]);

  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadGrades();
  }

  protected reloadGrades(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest<GradeProgressionsIndexData>(this.api.get(`${route}/progressions`), (res) => {
      const grades = res.data.grades ?? [];

      this.grades.set(grades);
      this.originalGradesOrder.set([...grades]);
      this.setScreenOptions(res.data.options);
    });
  }

  protected onRowOrderChange(rows: unknown[]): void {
    const ordered = rows as IGradeProgression[];

    this.grades.set(
      ordered.map((grade, index) => ({
        ...grade,
        order: index,
      })),
    );
  }

  protected cancelOrdering(): void {
    this.grades.set([...this.originalGradesOrder()]);
  }

  protected saveOrder(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const payload = {
      grades: this.grades().map((grade, index) => ({
        id: grade.id,
        order: index,
      })),
    };

    this.savingOrder.set(true);

    this.executeSilentRequest<{ grades: IGradeProgression[] }>(
      this.api.put(`${route}/order`, payload),
      (res) => {
        this.handleApiSuccess(res);

        const grades = res.data.grades ?? this.grades();

        this.grades.set(grades);
        this.originalGradesOrder.set([...grades]);
        this.savingOrder.set(false);
      },
      () => {
        this.savingOrder.set(false);
      },
    );
  }
}