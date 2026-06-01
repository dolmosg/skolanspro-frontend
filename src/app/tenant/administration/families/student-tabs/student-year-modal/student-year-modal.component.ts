import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { FormErrorComponent } from '@shared/ui/form-error/form-error';

export interface StudentYearModalData {
  studentId: number;
  studentYear?: StudentYearModalValue | null;
  catalogs?: StudentYearModalCatalogs | null;
}

export interface StudentYearModalCatalogs {
  school_years: any[];
  grades: any[];
  statuses: any[];
}

export interface StudentYearModalValue {
  id?: number;
  special_education: boolean;
  complements: boolean;
  grade_id: number | null;
  school_year_id: number | null;
  student_id: number;
  student_year_status_id: number | null;
}

export interface StudentYearModalResult {
  special_education: boolean;
  complements: boolean;
  grade_id: number;
  school_year_id: number;
  student_id: number;
  student_year_status_id: number;
}

@Component({
  selector: 'app-student-year-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    UiButtonComponent,
    SkSelectComponent,
    FormErrorComponent,
  ],
  templateUrl: './student-year-modal.component.html',
  styleUrl: './student-year-modal.component.scss',
})
export class StudentYearModalComponent extends SkolansBaseComponent implements OnInit {
  readonly data = input<StudentYearModalData | null>(null);

  private readonly fb = inject(FormBuilder);

  readonly submitted = signal(false);

  readonly studentYear = computed(() => this.data()?.studentYear ?? null);
  readonly catalogs = computed(() => this.data()?.catalogs ?? null);
  readonly isEdit = computed(() => !!this.studentYear()?.id);

  readonly studentId = computed(() => this.data()?.studentId ?? this.studentYear()?.student_id ?? null);

  readonly schoolYears = computed(() => this.catalogs()?.school_years ?? []);
  readonly grades = computed(() => this.catalogs()?.grades ?? []);
  readonly statuses = computed(() => this.catalogs()?.statuses ?? []);

  readonly form = this.fb.group({
    school_year_id: [null as number | null, [Validators.required]],
    grade_id: [null as number | null, [Validators.required]],
    student_year_status_id: [null as number | null, [Validators.required]],
    special_education: [false],
    complements: [false],
  });

  ngOnInit(): void {
    const studentYear = this.studentYear();

    if (studentYear) {
      this.form.patchValue({
        school_year_id: studentYear.school_year_id ?? null,
        grade_id: studentYear.grade_id ?? null,
        student_year_status_id: studentYear.student_year_status_id ?? null,
        special_education: !!studentYear.special_education,
        complements: !!studentYear.complements,
      });

      return;
    }

    this.patchDefaults();
  }

  private patchDefaults(): void {
    const currentSchoolYear = this.schoolYears().find((year) => year.current);
    const activeStatus = this.statuses().find((status) => status.name === 'active');

    this.form.patchValue({
      school_year_id: currentSchoolYear?.id ?? null,
      student_year_status_id: activeStatus?.id ?? null,
      special_education: false,
      complements: false,
    });
  }

  save(): void {
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const studentId = this.studentId();

    if (!studentId) {
      return;
    }

    const value = this.form.getRawValue();

    this.modal.close({
      student_id: studentId,
      school_year_id: Number(value.school_year_id),
      grade_id: Number(value.grade_id),
      student_year_status_id: Number(value.student_year_status_id),
      special_education: !!value.special_education,
      complements: !!value.complements,
    } satisfies StudentYearModalResult);
  }

  cancel(): void {
    this.modal.close(null);
  }

  hasError(controlName: keyof typeof this.form.controls, error: string): boolean {
    const control = this.form.controls[controlName];

    return control.hasError(error) && (control.touched || this.submitted());
  }
}