import { DatePipe } from '@angular/common';
import { Component, computed, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import { StudyPlanConfigurationItem } from '../../study-plan-configuration/study-plan-configuration.component';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';

interface StudyPlanGeneralShowData {
  'study-plan'?: StudyPlanGeneralItem | null;
  options?: ScreenOptionItem[];
  catalogs?: StudyPlanGeneralCatalogs;
}

interface StudyPlanGeneralUpdateData {
  'study-plan'?: StudyPlanGeneralItem | null;
}

interface StudyPlanGeneralItem {
  id: number;
  name: string;
  description: string | null;
  start: string | null;
  end: string | null;
  level_id: number;
  school_year_id: number;
  section_id: number;
  study_plan_structure_id: number;
  schedule_type_id: number;
  created_at: string;
  updated_at: string;
}

interface StudyPlanGeneralPayload {
  name: string;
  description: string | null;
  start: string | null;
  end: string | null;
  level_id: number;
  school_year_id: number;
  section_id: number;
  studyplan_structure_id: number;
  schedule_type_id: number;
}

interface StudyPlanGeneralCatalogs {
  years: CatalogItem[];
  levels: CatalogItem[];
  sections: CatalogItem[];
  'study-plan-structures': CatalogItem[];
  'schedule-types': CatalogItem[];
}

interface CatalogItem {
  id: number;
  name: string;
  description?: string | null;
  translation?: string | null;
  active?: boolean;
  order?: number;
}

@Component({
  selector: 'app-study-plan-general',
  imports: [DatePipe, TranslatePipe, ReactiveFormsModule, UiButtonComponent, SkSelectComponent],
  templateUrl: './study-plan-general.component.html',
  styleUrl: './study-plan-general.component.scss',
})
export class StudyPlanGeneralComponent extends SkolansBaseComponent implements OnInit {
  private readonly fb = new FormBuilder();

  readonly studyPlan = input<StudyPlanConfigurationItem | null>(null);
  readonly route = input<string | null>(null);

  protected readonly item = signal<StudyPlanGeneralItem | null>(null);
  protected readonly catalogs = signal<StudyPlanGeneralCatalogs>(this.emptyCatalogs());
  protected readonly editing = signal(false);

  protected readonly canEdit = computed(() => !!this.getScreenOption('update'));
  protected readonly canReset = computed(() => !!this.getScreenOption('reset'));

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: [null as string | null, [Validators.maxLength(255)]],
    start: [null as string | null, [Validators.required]],
    end: [null as string | null, [Validators.required]],
    level_id: [null as number | null, [Validators.required]],
    school_year_id: [null as number | null, [Validators.required]],
    section_id: [null as number | null, [Validators.required]],
    studyplan_structure_id: [null as number | null, [Validators.required]],
    schedule_type_id: [null as number | null, [Validators.required]],
  });

  ngOnInit(): void {
    this.loadGeneral();
  }

  protected startEdit(): void {
    const item = this.item();

    if (!item || !this.canEdit()) {
      return;
    }

    this.patchForm(item);
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    const item = this.item();

    if (item) {
      this.patchForm(item);
    }

    this.editing.set(false);
  }

  protected save(): void {
    const route = this.route();

    if (!route || this.form.invalid || !this.canEdit()) {
      this.form.markAllAsTouched();
      return;
    }

    this.executeMutationRequest<StudyPlanGeneralUpdateData>(
      this.api.put(route, this.buildPayload()),
      (res) => {
        const updated = res.data['study-plan'];

        if (!updated) {
          this.loadGeneral();
          return;
        }

        this.item.set(updated);
        this.patchForm(updated);
        this.editing.set(false);
      },
    );
  }

  protected getCatalogLabel(items: CatalogItem[], id: number | null | undefined): string {
    const item = items.find((catalogItem) => catalogItem.id === id);

    if (!item) {
      return '—';
    }

    return item.translation || item.description || item.name || '—';
  }

  private loadGeneral(): void {
    const route = this.route();

    if (!route) {
      return;
    }

    this.executeSilentRequest<StudyPlanGeneralShowData>(this.api.get(route), (res) => {
      const item = res.data['study-plan'] ?? null;

      this.item.set(item);
      this.catalogs.set(res.data.catalogs ?? this.emptyCatalogs());
      this.setScreenOptions(res.data.options ?? []);

      if (item) {
        this.patchForm(item);
      }
    });
  }

  private patchForm(item: StudyPlanGeneralItem): void {
    this.form.reset({
      name: item.name ?? '',
      description: item.description,
      start: this.toDateInputValue(item.start),
      end: this.toDateInputValue(item.end),
      level_id: item.level_id,
      school_year_id: item.school_year_id,
      section_id: item.section_id,
      studyplan_structure_id: item.study_plan_structure_id,
      schedule_type_id: item.schedule_type_id,
    });
  }

  private buildPayload(): StudyPlanGeneralPayload {
    const value = this.form.getRawValue();

    return {
      name: value.name?.trim() ?? '',
      description: this.nullableTrim(value.description),
      start: value.start,
      end: value.end,
      level_id: Number(value.level_id),
      school_year_id: Number(value.school_year_id),
      section_id: Number(value.section_id),
      studyplan_structure_id: Number(value.studyplan_structure_id),
      schedule_type_id: Number(value.schedule_type_id),
    };
  }

  private nullableTrim(value: string | null | undefined): string | null {
    const trimmed = value?.trim() ?? '';

    return trimmed.length > 0 ? trimmed : null;
  }

  private toDateInputValue(value: string | null): string | null {
    if (!value) {
      return null;
    }

    return value.slice(0, 10);
  }

  private emptyCatalogs(): StudyPlanGeneralCatalogs {
    return {
      years: [],
      levels: [],
      sections: [],
      'study-plan-structures': [],
      'schedule-types': [],
    };
  }
}
