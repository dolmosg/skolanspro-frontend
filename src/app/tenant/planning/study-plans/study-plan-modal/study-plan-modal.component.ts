import { Component, computed, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import {
  StudyPlansCatalogItem,
  StudyPlanStructureCatalogItem,
} from '../study-plans/study-plans.component';

export interface IStudyPlanModalData {
  school_year_id: number;
  section_id: number;
  catalogs: {
    levels: StudyPlansCatalogItem[];
    studyplan_structures: StudyPlanStructureCatalogItem[];
    schedule_types: StudyPlansCatalogItem[];
  };
}

export interface IStudyPlanModalResult {
  saved: boolean;
  mode: 'create';
  payload: {
    name: string;
    description: string | null;
    start: string;
    end: string;
    level_id: number;
    school_year_id: number;
    section_id: number;
    studyplan_structure_id: number;
    schedule_type_id: number;
  };
}

@Component({
  selector: 'app-study-plan-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, SkSelectComponent, UiButtonComponent],
  templateUrl: './study-plan-modal.component.html',
  styleUrl: './study-plan-modal.component.scss',
})
export class StudyPlanModalComponent {
  readonly data = input.required<IStudyPlanModalData>();

  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);

  protected readonly levels = computed(() => this.data().catalogs.levels ?? []);
  protected readonly structures = computed(() => this.data().catalogs.studyplan_structures ?? []);
  protected readonly scheduleTypes = computed(() => this.data().catalogs.schedule_types ?? []);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(70)]],
    description: ['', [Validators.maxLength(150)]],
    start: ['', [Validators.required]],
    end: ['', [Validators.required]],
    level_id: [null as number | null, [Validators.required]],
    studyplan_structure_id: [null as number | null, [Validators.required]],
    schedule_type_id: [null as number | null, [Validators.required]],
  });

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<IStudyPlanModalResult>({
      saved: true,
      mode: 'create',
      payload: this.buildPayload(),
    });
  }

  protected onCancel(): void {
    this.modal.close(null);
  }

  private buildPayload(): IStudyPlanModalResult['payload'] {
    const value = this.form.getRawValue();

    return {
      name: value.name.trim(),
      description: value.description.trim() || null,
      start: value.start,
      end: value.end,
      level_id: Number(value.level_id),
      school_year_id: this.data().school_year_id,
      section_id: this.data().section_id,
      studyplan_structure_id: Number(value.studyplan_structure_id),
      schedule_type_id: Number(value.schedule_type_id),
    };
  }
}