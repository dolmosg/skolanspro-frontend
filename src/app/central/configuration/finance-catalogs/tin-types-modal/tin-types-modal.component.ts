import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, computed, effect, inject, input, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { SklModalService } from '../../../../shared/services/skl-modal-service';
import { FormErrorComponent } from '../../../../shared/ui/form-error/form-error';
import { SkSelectComponent } from '../../../../shared/ui/sk-select/sk-select.component';

export interface ITinTypeModalData {
  id?: number;
  name?: string;
  translation?: string;
  validation?: string | null;
  country_id?: number;
  countries?: ITinTypeCountryOption[];
}

export interface ITinTypeCountryOption {
  id: number;
  name: string;
  iso_code: string;
  phone_code: string;
}

export interface ITinTypeModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string;
    validation: string | null;
    country_id: number;
  };
}

@Component({
  selector: 'app-tin-types-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, UiButtonComponent, FormErrorComponent, SkSelectComponent],
  templateUrl: './tin-types-modal.component.html',
  styleUrl: './tin-types-modal.component.scss',
})
export class TinTypesModalComponent implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = input<ITinTypeModalData | null>(null);

  protected readonly isEdit = computed(() => !!this.data()?.id);

  protected readonly helper = 'configuration.tin-types.translation';

  protected readonly countries = computed(() => this.data()?.countries ?? []);

  @ViewChild('nameInput') private readonly nameInput?: ElementRef<HTMLInputElement>;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    translation: ['', [Validators.required, Validators.maxLength(128)]],
    validation: ['' as string | null, [Validators.maxLength(128)]],
    country_id: [0, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    effect(() => {
      const item = this.data();

      this.form.reset({
        name: item?.name ?? '',
        translation: item?.translation ?? '',
        validation: item?.validation ?? '',
        country_id: item?.country_id ?? 0,
      });
    });
  }

  ngAfterViewInit(): void {
    const timer = window.setTimeout(() => {
      this.nameInput?.nativeElement.focus();
    });

    this.destroyRef.onDestroy(() => window.clearTimeout(timer));
  }

  protected onNameChange(value: string): void {
    const v = value?.trim();

    if (!v) {
      this.form.patchValue({ translation: '' });
      return;
    }

    this.form.patchValue({
      translation: `${this.helper}.${v}`,
    });
  }

  protected onCancel(): void {
    this.modal.close<ITinTypeModalResult>({
      saved: false,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.buildPayload(),
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<ITinTypeModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.buildPayload(),
    });
  }

  private buildPayload(): ITinTypeModalResult['payload'] {
    const value = this.form.getRawValue();

    return {
      name: value.name.trim(),
      translation: value.translation.trim(),
      validation: value.validation?.trim() || null,
      country_id: Number(value.country_id),
    };
  }
}
