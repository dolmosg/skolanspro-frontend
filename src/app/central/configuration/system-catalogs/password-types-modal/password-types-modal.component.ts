import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, computed, effect, inject, input, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { SklModalService } from '../../../../shared/services/skl-modal-service';
import { FormErrorComponent } from '../../../../shared/ui/form-error/form-error';

export interface IPasswordTypeModalData {
  id?: number;
  name?: string;
  translation?: string;
}

export interface IPasswordTypeModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string;
  };
}

@Component({
  selector: 'app-password-types-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, UiButtonComponent, FormErrorComponent],
  templateUrl: './password-types-modal.component.html',
  styleUrl: './password-types-modal.component.scss',
})
export class PasswordTypesModalComponent implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = input<IPasswordTypeModalData | null>(null);

  protected readonly isEdit = computed(() => !!this.data()?.id);

  protected readonly helper = 'configuration.password-types.translation';

  @ViewChild('nameInput') private readonly nameInput?: ElementRef<HTMLInputElement>;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    translation: ['', [Validators.required, Validators.maxLength(128)]],
  });

  constructor() {
    effect(() => {
      const item = this.data();

      this.form.reset({
        name: item?.name ?? '',
        translation: item?.translation ?? '',
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
    this.modal.close<IPasswordTypeModalResult>({
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

    this.modal.close<IPasswordTypeModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.buildPayload(),
    });
  }

  private buildPayload(): IPasswordTypeModalResult['payload'] {
    const value = this.form.getRawValue();

    return {
      name: value.name.trim(),
      translation: value.translation.trim(),
    };
  }
}
