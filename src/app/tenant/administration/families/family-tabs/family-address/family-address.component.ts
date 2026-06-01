import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

interface FamilyAddressProfile {
  id: number;
  street: string | null;
  outdoor: string | null;
  indoor: string | null;
  colony: string | null;
  city: string | null;
  state: string | null;
  municipality: string | null;
  zip_code: string | null;
  country_id: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface FamilyAddressFamily {
  id: number;
  address?: FamilyAddressProfile | null;
}

interface FamilyAddressIndexResponse {
  options: any[];
  catalogs?: {
    countries?: any[];
  };
}

interface FamilyAddressMutationResponse {
  address: FamilyAddressProfile;
}

@Component({
  selector: 'app-family-address',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, UiButtonComponent],
  templateUrl: './family-address.component.html',
  styleUrl: './family-address.component.scss',
})
export class FamilyAddressComponent extends SkolansBaseComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly family = input<FamilyAddressFamily | null>(null);
  readonly route = input<string | null>(null);

  readonly address = signal<FamilyAddressProfile | null>(null);
  readonly countries = signal<any[]>([]);

  readonly isEditing = computed(() => !!this.address());

  protected saveOptionName(): 'add' | 'update' {
    return this.address() ? 'update' : 'add';
  }

  protected saveLabel(): string {
    const option = this.getScreenOption(this.saveOptionName());

    return option?.translation ?? (this.address() ? 'common.update' : 'common.add');
  }

  protected saveIcon(): string {
    const option = this.getScreenOption(this.saveOptionName());

    return option?.icon ?? (this.address() ? 'save' : 'plus');
  }

  readonly form = this.fb.group({
    street: ['', [Validators.required, Validators.maxLength(70)]],
    outdoor: ['', [Validators.required, Validators.maxLength(70)]],
    indoor: ['', [Validators.maxLength(45)]],
    colony: ['', [Validators.required, Validators.maxLength(70)]],
    city: ['', [Validators.maxLength(70)]],
    state: ['', [Validators.required, Validators.maxLength(70)]],
    municipality: ['', [Validators.required, Validators.maxLength(70)]],
    zip_code: ['', [Validators.required, Validators.maxLength(10)]],
    country_id: [null as number | null, [Validators.required]],
  });

  constructor() {
    super();

    effect(() => {
      const address = this.family()?.address ?? null;

      this.address.set(address);
      this.patchForm(address);
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

    this.executeSilentRequest<FamilyAddressIndexResponse>(
      this.api.get<FamilyAddressIndexResponse>(route),
      (res) => {
        this.setScreenOptions(res.data.options ?? []);
        this.countries.set(res.data.catalogs?.countries ?? []);
      },
    );
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const route = this.route();
    const family = this.family();

    if (!route || !family?.id) {
      return;
    }

    const payload = this.form.getRawValue();

    if (this.address()) {
      this.updateAddress(route, family.id, payload);
      return;
    }

    this.createAddress(route, family.id, payload);
  }

  deleteAddress(): void {
    const route = this.route();
    const family = this.family();

    if (!route || !family?.id || !this.address()) {
      return;
    }

    this.executeSilentRequest<{ id: number }>(
      this.api.delete<{ id: number }>(`${route}/${family.id}`),
      () => {
        this.address.set(null);
        this.form.reset();
      },
    );
  }

  private createAddress(
    route: string,
    familyId: number,
    payload: ReturnType<typeof this.form.getRawValue>,
  ): void {
    this.executeSilentRequest<FamilyAddressMutationResponse>(
      this.api.post<FamilyAddressMutationResponse>(route, {
        ...payload,
        id: familyId,
      }),
      (res) => {
        this.address.set(res.data.address);
        this.patchForm(res.data.address);
      },
    );
  }

  private updateAddress(
    route: string,
    familyId: number,
    payload: ReturnType<typeof this.form.getRawValue>,
  ): void {
    this.executeSilentRequest<FamilyAddressMutationResponse>(
      this.api.put<FamilyAddressMutationResponse>(`${route}/${familyId}`, payload),
      (res) => {
        this.address.set(res.data.address);
        this.patchForm(res.data.address);
      },
    );
  }

  private patchForm(address: FamilyAddressProfile | null): void {
    this.form.reset({
      street: address?.street ?? '',
      outdoor: address?.outdoor ?? '',
      indoor: address?.indoor ?? '',
      colony: address?.colony ?? '',
      city: address?.city ?? '',
      state: address?.state ?? '',
      municipality: address?.municipality ?? '',
      zip_code: address?.zip_code ?? '',
      country_id: address?.country_id ?? null,
    });
  }

  protected canCreate(): boolean {
    return this.hasScreenOption('create');
  }

  protected canUpdate(): boolean {
    return this.hasScreenOption('update');
  }

  protected canDelete(): boolean {
    return this.hasScreenOption('delete');
  }

  protected canSave(): boolean {
    return this.hasScreenOption(this.saveOptionName());
  }

  resetForm(): void {
    this.patchForm(this.address());
  }
}
