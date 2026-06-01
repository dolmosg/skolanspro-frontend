
import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { SklModalService } from '../../../../shared/services/skl-modal-service';
import { FormErrorComponent } from '../../../../shared/ui/form-error/form-error';

export interface ITaxRegimeTinTypesModalTaxRegime {
  id: number;
  code: string;
  name: string;
}

export interface ITaxRegimeTinTypesModalTinType {
  id: number;
  name: string;
  translation: string;
  validation?: string | null;
  country_id: number;
  country?: {
    id: number;
    name: string;
    iso_code: string;
    phone_code: string;
  } | null;
}

export interface ITaxRegimeTinTypesModalData {
  taxRegime: ITaxRegimeTinTypesModalTaxRegime;
  tinTypes: ITaxRegimeTinTypesModalTinType[];
  selectedTinTypeIds?: number[];
}

export interface ITaxRegimeTinTypesModalResult {
  saved: boolean;
  payload: {
    tin_type_ids: number[];
  };
}

@Component({
  selector: 'app-tax-regimes-tin-types-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, UiButtonComponent, FormErrorComponent],
  templateUrl: './tax-regimes-tin-types-modal.component.html',
  styleUrl: './tax-regimes-tin-types-modal.component.scss',
})
export class TaxRegimesTinTypesModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);

  readonly data = input<ITaxRegimeTinTypesModalData | null>(null);

  protected readonly taxRegime = computed(() => this.data()?.taxRegime ?? null);
  protected readonly tinTypes = computed(() => this.data()?.tinTypes ?? []);

  protected readonly form = this.fb.nonNullable.group({
    tin_type_ids: [[] as number[]],
  });

  constructor() {
    effect(() => {
      const item = this.data();

      this.form.reset({
        tin_type_ids: item?.selectedTinTypeIds ?? [],
      });
    });
  }

  protected onTinTypeChange(tinTypeId: number, checked: boolean): void {
    const current = this.form.controls.tin_type_ids.value ?? [];

    const next = checked
      ? Array.from(new Set([...current, tinTypeId]))
      : current.filter((id) => id !== tinTypeId);

    this.form.controls.tin_type_ids.setValue(next);
    this.form.controls.tin_type_ids.markAsDirty();
    this.form.controls.tin_type_ids.markAsTouched();
  }

  protected onCancel(): void {
    this.modal.close<ITaxRegimeTinTypesModalResult>({
      saved: false,
      payload: this.buildPayload(),
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<ITaxRegimeTinTypesModalResult>({
      saved: true,
      payload: this.buildPayload(),
    });
  }

  private buildPayload(): ITaxRegimeTinTypesModalResult['payload'] {
    const value = this.form.getRawValue();

    return {
      tin_type_ids: value.tin_type_ids.map((id) => Number(id)),
    };
  }
}
