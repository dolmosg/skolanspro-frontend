import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SklModalService } from '../../../../shared/services/skl-modal-service';
import { FormErrorComponent } from '../../../../shared/ui/form-error/form-error';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { SkSelectComponent } from '../../../../shared/ui/sk-select/sk-select.component';

import { IPersonPhoneModalData, IPersonPhoneModalResult } from '../person-communication.interfaces';

@Component({
  selector: 'app-person-phone-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiButtonComponent,
    FormErrorComponent,
    TranslatePipe,
    SkSelectComponent,
  ],
  templateUrl: './person-phone-modal.component.html',
  styleUrl: './person-phone-modal.component.scss',
})
export class PersonPhoneModalComponent implements AfterViewInit {
  @ViewChild('phoneInput') protected phoneInput?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = input<IPersonPhoneModalData | null>(null);

  protected readonly phone = computed(() => this.data()?.phone ?? null);
  protected readonly personId = computed(() => this.data()?.personId ?? null);
  protected readonly phoneTypes = computed(() => this.data()?.phoneTypes ?? []);
  protected readonly countries = computed(() => this.data()?.countries ?? []);
  protected readonly defaultCountryId = computed(() => this.data()?.defaultCountryId ?? null);
  protected readonly isEdit = computed(() => !!this.phone()?.id);

  protected readonly phoneTypesNormalized = computed(() =>
    this.phoneTypes().map((type) => ({
      ...type,
      label: type.translation || type.description || type.name || '',
    })),
  );

  protected readonly countriesNormalized = computed(() =>
    this.countries().map((country) => ({
      ...country,
      label: `${country.name} +${country.phone_code}`,
    })),
  );

  protected readonly form = this.fb.nonNullable.group({
    country_id: this.fb.control<number | null>(null),
    phone_type_id: this.fb.control<number | null>(null),
    phone: ['', [Validators.required, Validators.maxLength(30)]],
  });

  constructor() {
    effect(() => {
      const phone = this.phone();

      this.form.reset({
        country_id: phone?.country_id ?? this.defaultCountryId(),
        phone_type_id: phone?.phone_type_id ?? null,
        phone: phone?.phone ?? '',
      });
    });
  }

  ngAfterViewInit(): void {
    const timer = window.setTimeout(() => {
      this.phoneInput?.nativeElement.focus();
    });

    this.destroyRef.onDestroy(() => window.clearTimeout(timer));
  }

  protected onCancel(): void {
    this.modal.close(null);
  }

  protected onSubmit(): void {
    if (this.form.invalid || !this.personId()) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();

    this.modal.close<IPersonPhoneModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: {
        person_id: this.personId()!,
        country_id: payload.country_id,
        phone: payload.phone,
        phone_type_id: payload.phone_type_id,
      },
    });
  }
}
