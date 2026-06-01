import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, OnInit, signal, Type } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import {
  StudentYearModalComponent,
  StudentYearModalData,
  StudentYearModalResult,
} from '../student-year-modal/student-year-modal.component';
import { SklConfirmModal } from '@shared/base/skl-confirm-modal/skl-confirm-modal';

interface StudentYear {
  id: number;
  special_education: boolean;
  complements: boolean;
  grade_id: number;
  school_year_id: number;
  student_id: number;
  student_year_status_id: number;
  school_year?: any | null;
  grade?: any | null;
  status?: any | null;
}

interface StudentYearsCatalogs {
  school_years: any[];
  grades: any[];
  statuses: any[];
}

interface StudentYearsIndexResponse {
  options: any[];
  catalogs: StudentYearsCatalogs;
}

interface StudentYearsMutationResponse {
  student_years: StudentYear[];
}

@Component({
  selector: 'app-student-years',
  standalone: true,
  imports: [CommonModule, TranslatePipe, UiButtonComponent],
  templateUrl: './student-years.component.html',
  styleUrl: './student-years.component.scss',
})
export class StudentYearsComponent extends SkolansBaseComponent implements OnInit {
  readonly studentId = input.required<number>();
  readonly route = input.required<string>();

  readonly studentYearsInput = input<StudentYear[]>([], { alias: 'studentYears' });

  readonly studentYears = signal<StudentYear[]>([]);
  readonly catalogs = signal<StudentYearsCatalogs | null>(null);

  readonly orderedYears = computed(() => {
    return [...this.studentYears()].sort((a, b) => {
      return (b.school_year?.order ?? 0) - (a.school_year?.order ?? 0);
    });
  });

  readonly currentYear = computed(() => {
    return this.studentYears().find((year) => year.school_year?.current) ?? null;
  });

  constructor() {
    super();

    effect(() => {
      this.studentYears.set(this.studentYearsInput() ?? []);
    });
  }

  ngOnInit(): void {
    this.loadOptions();
  }

  loadOptions(): void {
    const route = this.route();

    if (!route) {
      return;
    }

    this.executeSilentRequest<StudentYearsIndexResponse>(
      this.api.get<StudentYearsIndexResponse>(route),
      (res) => {
        this.setScreenOptions(res.data.options ?? []);
        this.catalogs.set(res.data.catalogs ?? null);
      },
    );
  }

  async onCreate(): Promise<void> {
    const studentId = this.studentId();

    if (!studentId) {
      return;
    }

    const result = await this.modal.open<StudentYearModalData, StudentYearModalResult>({
      component: StudentYearModalComponent,
      title: this.translate.instant('administration.student-years.create-title'),
      size: 'md',
      data: {
        studentId,
        catalogs: this.catalogs(),
      },
    });

    if (!result) {
      return;
    }

    this.executeSilentRequest<StudentYearsMutationResponse>(
      this.api.post<StudentYearsMutationResponse>(this.route(), result),
      (res) => {
        this.studentYears.set(res.data.student_years ?? []);
      },
    );
  }

  async onUpdate(studentYear: StudentYear): Promise<void> {
    const studentId = this.studentId();

    if (!studentId || !studentYear?.id) {
      return;
    }

    const result = await this.modal.open<StudentYearModalData, StudentYearModalResult>({
      component: StudentYearModalComponent,
      title: this.translate.instant('administration.student-years.update-title'),
      size: 'md',
      data: {
        studentId,
        studentYear,
        catalogs: this.catalogs(),
      },
    });

    if (!result) {
      return;
    }

    this.executeSilentRequest<StudentYearsMutationResponse>(
      this.api.put<StudentYearsMutationResponse>(`${this.route()}/${studentYear.id}`, result),
      (res) => {
        this.studentYears.set(res.data.student_years ?? []);
      },
    );
  }

  onWithdraw(year: StudentYear): void {
    // aquí irá el modal de baja
  }

  async onDelete(studentYear: StudentYear): Promise<void> {
    if (!studentYear?.id) {
      return;
    }

    const confirmed = await this.modal.open<any, boolean>({
      component: SklConfirmModal as Type<unknown>,
      title: this.translate.instant('administration.student-years.delete'),
      size: 'sm',
      closeOnBackdrop: false,
      closeOnEscape: true,
      showCloseButton: true,
      data: {
        message: this.translate.instant('administration.student-years.messages.confirm-delete'),
        confirmLabel: this.translate.instant('common.delete'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'danger',
      },
    });

    if (!confirmed) {
      return;
    }

    this.executeSilentRequest<StudentYearsMutationResponse>(
      this.api.delete<StudentYearsMutationResponse>(`${this.route()}/${studentYear.id}`),
      (res) => {
        this.studentYears.set(res.data.student_years ?? []);
      },
    );
  }
}
