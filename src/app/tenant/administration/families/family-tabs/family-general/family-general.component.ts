import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, input, output, OnInit, signal, Type } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { ScreenOptionItem } from '@shared/interfaces/configuration.interfaces';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { SkTextCaseDirective } from '@shared/directives/sk-text-mode-case';
import { FormErrorComponent } from '@shared/ui/form-error/form-error';
import { SklConfirmModal } from '@shared/base/skl-confirm-modal/skl-confirm-modal';
import { Router } from '@angular/router';

interface FamilyProfileStatus {
  id: number;
  name: string;
  translation: string;
  css_class: string;
  active: boolean;
  order: number;
}

interface FamilyProfile {
  id: number;
  code?: string | null;
  lastname: string;
  mothername?: string | null;
  full_name: string;
  display_name: string;
  email?: string | null;
  registered_at?: string | null;
  canceled_at?: string | null;
  family_status_id: number;   
  tutors_count: number;       
  students_count: number;       
  created_at?: string | null; 
  updated_at?: string | null;
  status?: FamilyProfileStatus | null;
}

interface FamilyStatus {
  id: number;
  name: string;
  translation: string;
  css_class: string;
  active: boolean;
  order: number;
}

interface FamilyGeneralResponse {
  options: ScreenOptionItem[];
  family_statuses: FamilyStatus[];
}

@Component({
  selector: 'app-family-general',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    DatePipe,
    SkSelectComponent,
    UiButtonComponent,
    SkTextCaseDirective,
    FormErrorComponent,
  ],
  templateUrl: './family-general.component.html',
  styleUrl: './family-general.component.scss',
})
export class FamilyGeneralComponent extends SkolansBaseComponent implements OnInit {
  private readonly fb = new FormBuilder();

  readonly family = input.required<FamilyProfile>();
  readonly route = input<string | null>(null);

  readonly familyUpdated = output<FamilyProfile>();

  readonly locale = this.siteState.locale;
  readonly timezone = this.siteState.timezone;
  readonly textCaseMode = this.nameCasing;

  readonly familyStatuses = signal<FamilyStatus[]>([]);

  readonly canUpdate = computed(() => this.hasScreenOption('update'));
  readonly canCancel = computed(() => this.hasScreenOption('cancel'));

  readonly submitted = signal(false);

  constructor(private router: Router) {
    super();
  }

  hasError(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || this.submitted());
  }

  readonly form = this.fb.group({
    lastname: ['', [Validators.required, Validators.maxLength(70)]],
    mothername: ['', [Validators.maxLength(70)]],
    email: ['', [Validators.email, Validators.maxLength(100)]],
    family_status_id: [null as number | null, [Validators.required]],
  });

  ngOnInit(): void {
    this.patchForm();
    this.loadOptions();
  }

  patchForm(): void {
    const family = this.family();

    this.form.patchValue({
      lastname: family.lastname ?? '',
      mothername: family.mothername ?? '',
      email: family.email ?? '',
      family_status_id: family.family_status_id ?? null,
    });
  }

  loadOptions(): void {
    const route = this.route();

    if (!route) {
      return;
    }

    this.executeSilentRequest<FamilyGeneralResponse>(
      this.api.get<FamilyGeneralResponse>(route),
      (res) => {
        this.setScreenOptions(res.data.options);
        this.familyStatuses.set(res.data.family_statuses ?? []);
      },
    );
  }

  save(): void {
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const route = this.route();
    const family = this.family();

    if (!route || !family?.id) {
      return;
    }

    const value = this.form.getRawValue();

    const payload = {
      lastname: value.lastname?.trim() || '',
      mothername: value.mothername?.trim() || null,
      email: value.email?.trim() || null,
      family_status_id: value.family_status_id,
    };

    this.executeMutationRequest(this.api.put(`${route}/${family.id}`, payload), (res: any) => {
      this.submitted.set(false);

      if (res.data?.family) {
        // Si luego hacemos output al padre, aquí emitimos la familia actualizada.
        this.form.markAsPristine();
        this.familyUpdated.emit(res.data.family);
      }
    });
  }

  cancelEdit(): void {
    this.patchForm();
  }

  async deleteFamily(): Promise<void> {
    const confirmed = await this.modal.open<any, boolean>({
      component: SklConfirmModal as Type<unknown>,
      data: {
        message: this.translate.instant('administration.family-general.messages.confirm-delete'),
        confirmLabel: this.translate.instant('common.delete'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'danger',
      },
      title: this.translate.instant('administration.family-general.messages.delete-title'),
      size: 'sm',
      closeOnBackdrop: false,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) {
      return;
    }

    const route = this.route();
    const family = this.family();

    if (!route || !family?.id) {
      return;
    }

    this.executeMutationRequest(this.api.delete(`${route}/${family.id}`), () => {
      // opción 1: regresar a la lista
      this.router.navigate(['../'], { relativeTo: this.activatedRoute });

      // opción 2 (si luego quieres):
      // emitir evento al padre y dejar que él navegue
      // this.familyDeleted.emit();
    });
  }
}
