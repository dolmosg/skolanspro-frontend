import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';

interface PersonField {
  id: number;
  name: string;
  translation: string;
  required: boolean;
  visible: boolean;
  protected?: boolean;
  order?: number;
}

interface StaffUsersCatalogs {
  person_profile: {
    genders: any[];
    marital_statuses: any[];
    blood_types: any[];
  };
  roles: any[];
}

interface StaffUserModalData {
  personFields: PersonField[];
  catalogs: StaffUsersCatalogs | null;
}

@Component({
  selector: 'app-staff-user-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, UiButtonComponent, SkSelectComponent],
  templateUrl: './staff-user-modal.component.html',
  styleUrl: './staff-user-modal.component.scss',
})
export class StaffUserModalComponent implements OnInit {
  readonly data = input.required<StaffUserModalData>();

  private readonly modal = inject(SklModalService);

  form = new FormGroup<Record<string, FormControl>>({});

  protected readonly personFields = computed(() => this.data().personFields ?? []);
  protected readonly catalogs = computed(() => this.data().catalogs ?? null);
  protected readonly roles = computed(() => this.catalogs()?.roles ?? []);

  protected readonly visibleFields = computed(() =>
    [...this.personFields()]
      .filter((field) => field.visible)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  );

  ngOnInit(): void {
    this.buildForm();
  }

  private buildForm(): void {
    const controls: Record<string, FormControl> = {
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email, Validators.maxLength(128)],
      }),
      role_id: new FormControl(null, {
        validators: [Validators.required],
      }),
    };

    for (const field of this.visibleFields()) {
      controls[field.name] = new FormControl(null, {
        validators: this.fieldValidators(field),
      });
    }

    this.form = new FormGroup(controls);
  }

  control(name: string): FormControl {
    return this.form.controls[name];
  }

  isInvalid(name: string): boolean {
    const control = this.control(name);

    return control.invalid && (control.dirty || control.touched);
  }

  isSelectField(fieldName: string): boolean {
    return ['gender_id', 'marital_status_id', 'blood_type_id'].includes(fieldName);
  }

  selectItems(fieldName: string): any[] {
    const profile = this.catalogs()?.person_profile;

    const map: Record<string, any[]> = {
      gender_id: profile?.genders ?? [],
      marital_status_id: profile?.marital_statuses ?? [],
      blood_type_id: profile?.blood_types ?? [],
    };

    return map[fieldName] ?? [];
  }

  inputType(fieldName: string): string {
    if (fieldName.includes('date') || fieldName === 'birthdate') {
      return 'date';
    }

    return 'text';
  }

  onCancel(): void {
    this.modal.close(null);
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close(this.form.getRawValue());
  }

  private fieldValidators(field: PersonField) {
    const validators = [];

    if (field.required) {
      validators.push(Validators.required);
    }

    return validators;
  }
}