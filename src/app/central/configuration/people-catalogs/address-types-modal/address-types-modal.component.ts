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

export interface IAddressTypeModalData {
  id?: number;
  description?: string;
  translation?: string | null;
}

export interface IAddressTypeModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    description: string;
    translation: string;
  };
}

@Component({
  selector: 'app-address-types-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiButtonComponent,
    FormErrorComponent,
    TranslatePipe,
  ],
  templateUrl: './address-types-modal.component.html',
  styleUrl: './address-types-modal.component.scss',
})
export class AddressTypesModalComponent implements AfterViewInit {
  @ViewChild('descriptionInput')
  protected descriptionInput?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = input<IAddressTypeModalData | null>(null);

  protected readonly helper = 'configuration.address-types.translation';

  protected readonly isEdit = computed(() => !!this.data()?.id);

  protected readonly form = this.fb.nonNullable.group({
    description: ['', [Validators.required, Validators.maxLength(45)]],
    translation: ['', [Validators.required, Validators.maxLength(128)]],
  });

  constructor() {
    effect(() => {
      const addressType = this.data();

      this.form.reset({
        description: addressType?.description ?? '',
        translation: addressType?.translation ?? '',
      });
    });
  }

  ngAfterViewInit(): void {
    const timer = window.setTimeout(() => {
      this.descriptionInput?.nativeElement.focus();
    });

    this.destroyRef.onDestroy(() => window.clearTimeout(timer));
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

    this.modal.close<IAddressTypeModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: {
        description: payload.description.trim(),
        translation: payload.translation.trim(),
      },
    });
  }

  protected onDescriptionChange(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value?.trim() ?? '';

    this.form.controls.translation.setValue(
      this.isEdit() || !value
        ? this.form.controls.translation.value
        : `${this.helper}.${value}`,
    );

    if (!value && !this.isEdit()) {
      this.form.controls.translation.setValue('');
    }
  }
}