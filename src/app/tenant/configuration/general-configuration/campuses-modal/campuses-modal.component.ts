import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import { ICampus } from '../campuses/campuses.component';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '@shared/services/api-service';

export interface CampusesModalData {
  campus?: ICampus | null;
}

export interface CampusesModalPayload {
  name: string;
  description: string | null;
  street: string | null;
  outdoor: string | null;
  indoor: string | null;
  colony: string | null;
  city: string | null;
  state: string | null;
  municipality: string | null;
  zip_code: string | null;
  css_class: string | null;
  active: boolean;
  translation: string | null;
}

export interface CampusesModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload?: CampusesModalPayload;
}

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
  selector: 'app-campuses-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiButtonComponent, TranslatePipe],
  templateUrl: './campuses-modal.component.html',
  styleUrl: './campuses-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampusesModalComponent {

  private readonly api = inject(ApiService);
  private readonly modal = inject(SklModalService);
  private readonly fb = inject(FormBuilder);

  readonly data = input<CampusesModalData | null>(null);

  protected readonly postalCodeSettlements = signal<PostalCodeSettlement[]>([]);
  protected readonly hasPostalCodeOptions = computed(() => this.postalCodeSettlements().length > 1);

  protected readonly campus = computed(() => this.data()?.campus ?? null);
  protected readonly isEditMode = computed(() => !!this.campus()?.id);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(150)]],
    street: ['', [Validators.maxLength(150)]],
    outdoor: ['', [Validators.maxLength(20)]],
    indoor: ['', [Validators.maxLength(20)]],
    colony: ['', [Validators.maxLength(100)]],
    city: ['', [Validators.maxLength(100)]],
    state: ['', [Validators.maxLength(100)]],
    municipality: ['', [Validators.maxLength(100)]],
    zip_code: ['', [Validators.maxLength(10)]],
    css_class: ['', [Validators.maxLength(45)]],
    active: [true, [Validators.required]],
    translation: ['', [Validators.maxLength(128)]],
  });

  constructor() {
    effect(() => {
      const campus = this.campus();

      this.form.reset({
        name: campus?.name ?? '',
        description: campus?.description ?? '',
        street: campus?.street ?? '',
        outdoor: campus?.outdoor ?? '',
        indoor: campus?.indoor ?? '',
        colony: campus?.colony ?? '',
        city: campus?.city ?? '',
        state: campus?.state ?? '',
        municipality: campus?.municipality ?? '',
        zip_code: campus?.zip_code ?? '',
        css_class: campus?.css_class ?? '',
        active: campus?.active ?? true,
        translation: campus?.translation ?? '',
      });
    });
  }

  protected onCancel(): void {
    this.modal.close<CampusesModalResult>({
      saved: false,
      mode: this.getMode(),
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<CampusesModalResult>({
      saved: true,
      mode: this.getMode(),
      payload: this.buildPayload(),
    });
  }

  private getMode(): 'create' | 'edit' {
    return this.isEditMode() ? 'edit' : 'create';
  }

  private buildPayload(): CampusesModalPayload {
    const value = this.form.getRawValue();

    return {
      name: value.name.trim(),
      description: this.nullableTrim(value.description),
      street: this.nullableTrim(value.street),
      outdoor: this.nullableTrim(value.outdoor),
      indoor: this.nullableTrim(value.indoor),
      colony: this.nullableTrim(value.colony),
      city: this.nullableTrim(value.city),
      state: this.nullableTrim(value.state),
      municipality: this.nullableTrim(value.municipality),
      zip_code: this.nullableTrim(value.zip_code),
      css_class: this.nullableTrim(value.css_class),
      active: value.active,
      translation: this.nullableTrim(value.translation),
    };
  }

  private nullableTrim(value: string | null | undefined): string | null {
    const trimmed = value?.trim() ?? '';

    return trimmed.length > 0 ? trimmed : null;
  }

  protected onZipCodeChange(): void {
  const zipCode = String(this.form.controls.zip_code.value ?? '').trim();

  /**
   * Postal codes in Mexico must contain exactly 5 digits.
   */
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
}