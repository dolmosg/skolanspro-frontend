import { Component, computed, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PercentPipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import { StudyPlanConfigurationItem } from '../../study-plan-configuration/study-plan-configuration.component';

interface StudyPlanAttendanceShowData {
  'attendance-setting'?: StudyPlanAttendanceSetting | null;
  options?: ScreenOptionItem[];
  catalogs?: StudyPlanAttendanceCatalogs;
}

interface StudyPlanAttendanceUpdateData {
  'attendance-setting'?: StudyPlanAttendanceSetting | null;
}

interface StudyPlanAttendanceSetting {
  id: number;
  study_plan_id: number;
  attendance_type_id: number | null;
  attendance_calculation_id: number | null;
  attendance_details: boolean;
  delay_absence_ratio: number;
  attendance_delay: number;
  attendance_percent: string;
  created_at: string;
  updated_at: string;

  attendance_type?: CatalogItem | null;
  attendance_calculation?: CatalogItem | null;
}

interface StudyPlanAttendancePayload {
  attendance_type_id: number | null;
  attendance_calculation_id: number | null;
  attendance_details: boolean;
  delay_absence_ratio: number;
  attendance_delay: number;
  attendance_percent: number;
}

interface StudyPlanAttendanceCatalogs {
  'attendance-types': CatalogItem[];
  'attendance-calculations': CatalogItem[];
}

interface CatalogItem {
  id: number;
  name: string;
  translation?: string | null;
  active?: boolean | number;
  order?: number;
}

@Component({
  selector: 'app-study-plan-attendance',
  imports: [ReactiveFormsModule, TranslatePipe, PercentPipe, UiButtonComponent, SkSelectComponent],
  templateUrl: './study-plan-attendance.component.html',
  styleUrl: './study-plan-attendance.component.scss',
})
export class StudyPlanAttendanceComponent extends SkolansBaseComponent implements OnInit {
  readonly studyPlan = input<StudyPlanConfigurationItem | null>(null);
  readonly route = input<string | null>(null);

  protected readonly item = signal<StudyPlanAttendanceSetting | null>(null);
  protected readonly catalogs = signal<StudyPlanAttendanceCatalogs>(this.emptyCatalogs());
  protected readonly editing = signal(false);

  protected readonly canEdit = computed(() => !!this.getScreenOption('update'));
  protected readonly canReset = computed(() => !!this.getScreenOption('reset'));

  protected readonly attendancePercentPreview = signal(0);

  private readonly fb = new FormBuilder();

  protected readonly form = this.fb.nonNullable.group({
    attendance_type_id: [null as number | null, [Validators.required]],
    attendance_calculation_id: [null as number | null, [Validators.required]],
    attendance_details: [false],
    delay_absence_ratio: [3, [Validators.required, Validators.min(1)]],
    attendance_delay: [10, [Validators.required, Validators.min(0)]],
    attendance_percent: [80, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  protected readonly attendanceExplanation = computed(() => {
    const percent = this.editing()
      ? this.formatPercent(this.attendancePercentPreview() / 100)
      : this.formatPercent(this.item()?.attendance_percent ?? 0);

    return this.translate.instant('planning.study-plan-attendance.explanation.main', {
      percent,
    });
  });

  ngOnInit(): void {
    this.loadAttendance();

    this.form.controls.attendance_percent.valueChanges.subscribe((value) => {
      this.attendancePercentPreview.set(Number(value ?? 0));
    });
  }

  protected startEdit(): void {
    console.log("start edit");
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

    this.executeMutationRequest<StudyPlanAttendanceUpdateData>(
      this.api.put(route, this.buildPayload()),
      (res) => {
        const updated = res.data['attendance-setting'];

        if (!updated) {
          this.loadAttendance();
          return;
        }

        this.item.set(updated);
        this.patchForm(updated);
        this.editing.set(false);
      },
    );
  }

  protected getCatalogLabel(items: CatalogItem[], id: number | null): string {
    const item = items.find((i) => i.id === id);

    return item?.translation || item?.name || '—';
  }

  private loadAttendance(): void {
    const route = this.route();

    if (!route) {
      return;
    }

    this.executeSilentRequest<StudyPlanAttendanceShowData>(this.api.get(route), (res) => {
      const item = res.data['attendance-setting'] ?? null;

      this.item.set(item);
      this.catalogs.set(res.data.catalogs ?? this.emptyCatalogs());
      this.setScreenOptions(res.data.options ?? []);

      if (item) {
        this.patchForm(item);
      }
    });
  }

  private patchForm(item: StudyPlanAttendanceSetting): void {
    const attendancePercent = Number(item.attendance_percent) * 100;

    this.attendancePercentPreview.set(attendancePercent);

    this.form.reset({
      attendance_type_id: item.attendance_type_id,
      attendance_calculation_id: item.attendance_calculation_id,
      attendance_details: item.attendance_details,
      delay_absence_ratio: item.delay_absence_ratio,
      attendance_delay: item.attendance_delay,
      attendance_percent: attendancePercent,
    });
  }

  private buildPayload(): StudyPlanAttendancePayload {
    const value = this.form.getRawValue();

    return {
      attendance_type_id: value.attendance_type_id,
      attendance_calculation_id: value.attendance_calculation_id,
      attendance_details: value.attendance_details,
      delay_absence_ratio: Number(value.delay_absence_ratio),
      attendance_delay: Number(value.attendance_delay),
      attendance_percent: Number(value.attendance_percent) / 100,
    };
  }

  private formatPercent(value: string | number | null): string {
    return `${Math.round(Number(value ?? 0) * 100)}%`;
  }

  private emptyCatalogs(): StudyPlanAttendanceCatalogs {
    return {
      'attendance-types': [],
      'attendance-calculations': [],
    };
  }
}