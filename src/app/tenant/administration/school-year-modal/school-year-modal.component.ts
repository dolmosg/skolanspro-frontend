import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

export interface ISchoolYearModalData {
  id?: number;
  name?: string;
  current?: boolean;
  visible?: boolean;
  order?: number;
}

export interface ISchoolYearModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    current: boolean;
    visible: boolean;
    order: number;
  };
}

@Component({
  selector: 'app-school-year-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, UiButtonComponent],
  templateUrl: './school-year-modal.component.html',
  styleUrl: './school-year-modal.component.scss',
})
export class SchoolYearModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);

  private readonly modalData = this.modal.state().data as ISchoolYearModalData | null;

  protected readonly mode = computed<'create' | 'edit'>(() => {
    return this.modalData?.id ? 'edit' : 'create';
  });

  protected readonly form = this.fb.nonNullable.group({
    name: [
      this.modalData?.name ?? '',
      [
        Validators.required,
        Validators.maxLength(45),
        Validators.pattern(/^\d{4}-\d{4}$/),
      ],
    ],
    current: [this.modalData?.current ?? false],
    visible: [this.modalData?.visible ?? true],
    order: [this.modalData?.order ?? 0, [Validators.required, Validators.min(0)]],
  });

  protected get nameInvalid(): boolean {
    const control = this.form.controls.name;
    return control.invalid && (control.dirty || control.touched);
  }

  protected get orderInvalid(): boolean {
    const control = this.form.controls.order;
    return control.invalid && (control.dirty || control.touched);
  }

  protected cancel(): void {
    this.modal.close<ISchoolYearModalResult>({
      saved: false,
      mode: this.mode(),
      payload: this.form.getRawValue(),
    });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<ISchoolYearModalResult>({
      saved: true,
      mode: this.mode(),
      payload: this.form.getRawValue(),
    });
  }
}