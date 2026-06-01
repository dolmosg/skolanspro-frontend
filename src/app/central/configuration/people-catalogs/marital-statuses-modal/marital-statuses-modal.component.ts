
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, computed, effect, inject, input, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { SklModalService } from '../../../../shared/services/skl-modal-service';
import { FormErrorComponent } from '../../../../shared/ui/form-error/form-error';

/**
 * Data received by the marital statuses modal.
 */
export interface IMaritalStatusModalData {
  id?: number;
  name?: string;
  translation?: string;
}

/**
 * Result returned to the parent component when the modal is saved.
 */
export interface IMaritalStatusModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string;
  };
}

/**
 * Marital Statuses Modal Component
 * --------------------------------
 * Handles the creation and edition form for the marital statuses catalog.
 */
@Component({
  selector: 'app-marital-statuses-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, UiButtonComponent, FormErrorComponent],
  templateUrl: './marital-statuses-modal.component.html',
  styleUrl: './marital-statuses-modal.component.scss',
})
export class MaritalStatusesModalComponent implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);
  private readonly destroyRef = inject(DestroyRef);

  /** Optional data (edit mode). */
  readonly data = input<IMaritalStatusModalData | null>(null);

  /** Determines if modal is in edit mode. */
  protected readonly isEdit = computed(() => !!this.data()?.id);

  /** Helper for translation key generation. */
  protected readonly helper = 'configuration.marital-statuses.translation';

  /** Main input for autofocus. */
  @ViewChild('nameInput') private readonly nameInput?: ElementRef<HTMLInputElement>;

  /** Reactive form. */
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

  /** Autofocus after render. */
  ngAfterViewInit(): void {
    const timer = window.setTimeout(() => {
      this.nameInput?.nativeElement.focus();
    });

    this.destroyRef.onDestroy(() => window.clearTimeout(timer));
  }

  /** Auto-generate translation key from name. */
  protected onNameChange(): void {
    const value = this.form.controls.name.value.trim();

    if (!value) {
      this.form.controls.translation.setValue('');
      return;
    }

    this.form.controls.translation.setValue(`${this.helper}.${value}`);
  }

  /** Cancel modal. */
  protected onCancel(): void {
    this.modal.close<IMaritalStatusModalResult>({
      saved: false,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.form.getRawValue(),
    });
  }

  /** Submit modal. */
  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<IMaritalStatusModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.form.getRawValue(),
    });
  }
}
