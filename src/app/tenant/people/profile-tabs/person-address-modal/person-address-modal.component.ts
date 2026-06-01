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
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SklModalService } from '../../../../shared/services/skl-modal-service';
import { FormErrorComponent } from '../../../../shared/ui/form-error/form-error';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { SkSelectComponent } from '../../../../shared/ui/sk-select/sk-select.component';
import { ApiService } from '@shared/services/api-service';

import {
  IPersonAddressModalData,
  IPersonAddressModalResult,
} from '../person-communication.interfaces';
import { firstValueFrom } from 'rxjs';

interface PostalCodeSettlement {
  id: number;
  postal_code: string;
  settlement: string;
  settlement_type: string | null;
  municipality: string | null;
  state: string | null;
  city: string | null;
}

@Component({
  selector: 'app-person-address-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiButtonComponent,
    FormErrorComponent,
    TranslatePipe,
    SkSelectComponent,
  ],
  templateUrl: './person-address-modal.component.html',
  styleUrl: './person-address-modal.component.scss',
})
export class PersonAddressModalComponent implements AfterViewInit {
  @ViewChild('typeSelect') protected typeSelect?: any;

  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly postalCodeSettlements = signal<PostalCodeSettlement[]>([]);
  protected readonly hasPostalCodeOptions = computed(() => this.postalCodeSettlements().length > 1);

  readonly data = input<IPersonAddressModalData | null>(null);

  protected readonly address = computed(() => this.data()?.address ?? null);
  protected readonly personId = computed(() => this.data()?.personId ?? null);
  protected readonly addressTypes = computed(() => this.data()?.addressTypes ?? []);
  protected readonly countries = computed(() => this.data()?.countries ?? []);
  protected readonly defaultCountryId = computed(() => this.data()?.defaultCountryId ?? null);
  protected readonly isEdit = computed(() => !!this.address()?.id);

  protected readonly addressTypesNormalized = computed(() =>
    this.addressTypes().map((type) => ({
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
    person_id: this.fb.control<number | null>(null, [Validators.required]),
    name: this.fb.control<string | null>(null, [Validators.maxLength(100)]),
    address_type_id: this.fb.control<number | null>(null, [Validators.required]),
    country_id: this.fb.control<number | null>(null, [Validators.required]),
    street: ['', [Validators.required, Validators.maxLength(150)]],
    outdoor: ['', [Validators.required, Validators.maxLength(30)]],
    indoor: this.fb.control<string | null>(null, [Validators.maxLength(30)]),
    colony: ['', [Validators.required, Validators.maxLength(100)]],
    city: ['', [Validators.required, Validators.maxLength(100)]],
    state: ['', [Validators.required, Validators.maxLength(100)]],
    municipality: ['', [Validators.required, Validators.maxLength(100)]],
    zip_code: ['', [Validators.required, Validators.maxLength(20)]],
  });

  constructor() {
    effect(() => {
      const address = this.address();

      this.form.reset({
        person_id: this.personId(),
        name: address?.name ?? null,
        address_type_id: address?.address_type_id ?? null,
        country_id: address?.country_id ?? this.defaultCountryId(),
        street: address?.street ?? '',
        outdoor: address?.outdoor ?? '',
        indoor: address?.indoor ?? null,
        colony: address?.colony ?? '',
        city: address?.city ?? '',
        state: address?.state ?? '',
        municipality: address?.municipality ?? '',
        zip_code: address?.zip_code ?? '',
      });
    });
  }

  ngAfterViewInit(): void {
  const timer = window.setTimeout(() => {
    this.typeSelect?.focus?.();
  });

  this.destroyRef.onDestroy(() => window.clearTimeout(timer));
}

  protected onZipCodeChange(): void {
    const zipCode = String(this.form.controls.zip_code.value ?? '').trim();

    if (!/^[0-9]{5}$/.test(zipCode)) {
      return;
    }

    this.searchZipCode(zipCode);
  }

  protected async searchZipCode(zip: string): Promise<void> {
    const response = await firstValueFrom(
      this.api.get<{
        postal_code: string;
        settlements: PostalCodeSettlement[];
      }>(`postal-codes/search?postal_code=${encodeURIComponent(zip)}`, {
        loader: false,
      }),
    );

    if (!response.success) {
      return;
    }

    const settlements = response.data.settlements ?? [];

    this.postalCodeSettlements.set(settlements);

    if (settlements.length === 1) {
      this.applySettlement(settlements[0]);
    }
  }

  protected selectSettlement(settlement: PostalCodeSettlement): void {
    this.applySettlement(settlement);
    this.postalCodeSettlements.set([]);
  }

  private applySettlement(settlement: PostalCodeSettlement): void {
    this.form.patchValue({
      colony: settlement.settlement,
      municipality: settlement.municipality!,
      state: settlement.state!,
      city: settlement.city!,
    });
  }

  protected onCancel(): void {
    this.modal.close(null);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();

    this.modal.close<IPersonAddressModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: {
        person_id: payload.person_id!,
        name: payload.name,
        street: payload.street,
        outdoor: payload.outdoor,
        indoor: payload.indoor,
        colony: payload.colony,
        city: payload.city,
        state: payload.state,
        municipality: payload.municipality,
        zip_code: payload.zip_code,
        address_type_id: payload.address_type_id!,
        country_id: payload.country_id!,
      },
    });
  }
}
