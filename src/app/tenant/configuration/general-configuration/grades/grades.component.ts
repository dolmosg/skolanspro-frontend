import { ChangeDetectionStrategy, Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef, GetRowIdParams } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '@shared/base/base-crud';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import {
  GradesModalComponent,
  GradesModalData,
  GradesModalResult,
} from '../grades-modal/grades-modal.component';

export interface IGradeLevel {
  id: number;
  name: string;
  description: string;
}

export interface IGrade {
  id: number;
  name: string;
  description: string;
  order: number;
  active: boolean;
  level_id: number;
  level?: IGradeLevel | null;
}

interface GradesIndexData {
  level: IGradeLevel;
  grades: IGrade[];
  options?: Parameters<BaseCrud<IGrade>['setScreenOptions']>[0];
}

@Component({
  selector: 'app-grades',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './grades.component.html',
  styleUrl: './grades.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradesComponent extends BaseCrud<IGrade> implements OnInit {
  protected readonly grades = signal<IGrade[]>([]);
  protected readonly selectedGrades = signal<IGrade[]>([]);
  protected readonly level = signal<IGradeLevel | null>(null);

  protected readonly levelId = computed(() => {
    const value = this.activatedRoute.snapshot.paramMap.get('levelId');
    return value ? Number(value) : null;
  });

  protected readonly hasGrades = computed(() => this.grades().length > 0);
  protected readonly hasSelection = computed(() => this.selectedGrades().length > 0);
  protected readonly hasSingleSelection = computed(() => this.selectedGrades().length === 1);

  protected readonly getRowId = (params: GetRowIdParams<IGrade>): string => {
    return String(params.data.id);
  };

  protected readonly columnDefs = computed<ColDef<IGrade>[]>(() => [
    {
      field: 'name',
      headerValueGetter: () => this.translate.instant('configuration.grades.fields.name'),
      flex: 1,
      minWidth: 180,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'description',
      headerValueGetter: () => this.translate.instant('configuration.grades.fields.description'),
      flex: 1,
      minWidth: 220,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
    },
    {
      field: 'active',
      headerValueGetter: () => this.translate.instant('configuration.grades.fields.active'),
      width: 140,
      minWidth: 140,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
      valueGetter: (params) =>
        params.data?.active
          ? this.translate.instant('common.yes')
          : this.translate.instant('common.no'),
      filterValueGetter: (params) =>
        params.data?.active
          ? this.translate.instant('common.yes')
          : this.translate.instant('common.no'),
    },
  ]);

  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadGrades();
  }

  protected reloadGrades(): void {
    const route = this.apiRoute();
    const levelId = this.levelId();

    if (!route || !levelId) {
      return;
    }

    this.executeSilentRequest<GradesIndexData>(this.api.get(`${route}/${levelId}`), (res) => {
      this.level.set(res.data.level ?? null);
      this.grades.set(res.data.grades ?? []);
      this.setScreenOptions(res.data.options);
      this.clearSelection(this.selectedGrades);
    });
  }

  protected async onAdd(): Promise<void> {
    const level = this.level();

    if (!level) {
      return;
    }

    const result = await this.modal.open<GradesModalData, GradesModalResult>({
      component: GradesModalComponent,
      data: {
        grade: null,
        level,
      },
      title: this.translate.instant('configuration.grades.add'),
      description: this.translate.instant('configuration.grades.messages.create-description'),
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

    this.executeMutationRequest<{ grade: IGrade }>(this.api.post(route, result.payload), (res) => {
      const createdGrade = res.data.grade;

      if (!createdGrade) {
        this.reloadGrades();
        return;
      }

      this.applyCreatedItem(this.grades, createdGrade);
      this.clearSelection(this.selectedGrades);
    });
  }

  protected async onEdit(): Promise<void> {
    const level = this.level();
    const grade = this.selectedGrades()[0];

    if (!level || !grade) {
      return;
    }

    const result = await this.modal.open<GradesModalData, GradesModalResult>({
      component: GradesModalComponent,
      data: {
        grade,
        level,
      },
      title: this.translate.instant('configuration.grades.update'),
      description: this.translate.instant('configuration.grades.messages.update-description'),
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

    this.executeMutationRequest<{ grade: IGrade }>(
      this.api.put(`${route}/${grade.id}`, result.payload),
      (res) => {
        const updatedGrade = res.data.grade;

        if (!updatedGrade) {
          this.reloadGrades();
          return;
        }

        this.applyUpdatedItem(this.grades, updatedGrade);
        this.selectedGrades.set([updatedGrade]);
      },
    );
  }

  protected async onDelete(): Promise<void> {
    const grade = this.selectedGrades()[0];

    if (!grade) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'configuration.grades.delete',
      'configuration.grades.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeMutationRequest<unknown>(this.api.delete(`${route}/${grade.id}`), () => {
      this.applyDeletedItem(this.grades, grade.id);
      this.clearSelection(this.selectedGrades);
    });
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedGrades.set(rows as IGrade[]);
  }
}
