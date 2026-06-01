import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, computed, effect, inject, input, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { SklModalService } from '../../../../shared/services/skl-modal-service';
import { FormErrorComponent } from '../../../../shared/ui/form-error/form-error';
import { SkSelectComponent } from '../../../../shared/ui/sk-select/sk-select.component';

export interface ICountryModalData {
  id?: number;
  name?: string;
  phone_code?: string;
  iso_code?: string;
  language?: string;
  languages?: ICountryLanguageOption[];
}

export interface ICountryLanguageOption {
  code: string;
  label: string;
}

export interface ICountryModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    phone_code: string;
    iso_code: string;
    language: string;
  };
}

@Component({
  selector: 'app-countries-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, UiButtonComponent, FormErrorComponent, SkSelectComponent],
  templateUrl: './countries-modal.component.html',
  styleUrl: './countries-modal.component.scss',
})
export class CountriesModalComponent implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = input<ICountryModalData | null>(null);

  protected readonly isEdit = computed(() => !!this.data()?.id);

  protected readonly languages = computed(() => this.data()?.languages ?? []);

  @ViewChild('nameInput') private readonly nameInput?: ElementRef<HTMLInputElement>;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    phone_code: ['', [Validators.required, Validators.maxLength(10)]],
    iso_code: ['', [Validators.required, Validators.maxLength(10)]],
    language: ['en-US', [Validators.required, Validators.maxLength(45)]],
  });

  constructor() {
    effect(() => {
      const item = this.data();

      this.form.reset({
        name: item?.name ?? '',
        phone_code: item?.phone_code ?? '',
        iso_code: item?.iso_code ?? '',
        language: item?.language ?? 'en-US',
      });
    });
  }

  ngAfterViewInit(): void {
    const timer = window.setTimeout(() => {
      this.nameInput?.nativeElement.focus();
    });

    this.destroyRef.onDestroy(() => window.clearTimeout(timer));
  }

  protected onCancel(): void {
    this.modal.close<ICountryModalResult>({
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

    this.modal.close<ICountryModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.buildPayload(),
    });
  }

  private buildPayload(): ICountryModalResult['payload'] {
    const value = this.form.getRawValue();

    return {
      name: value.name.trim(),
      phone_code: value.phone_code.trim(),
      iso_code: value.iso_code.trim().toUpperCase(),
      language: value.language.trim(),
    };
  }
}
