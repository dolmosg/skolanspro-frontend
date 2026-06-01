
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, computed, effect, inject, input, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { SklModalService } from '../../../../shared/services/skl-modal-service';
import { FormErrorComponent } from '../../../../shared/ui/form-error/form-error';

/**
 * Data received by the name casings modal.
 */
export interface INameCasingModalData {
  id?: number;
  name?: string;
  translation?: string;
}

/**
 * Result returned to the parent component when the modal is saved.
 */
export interface INameCasingModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string;
  };
}

/**
 * Name Casings Modal Component
 * ----------------------------
 * Handles the creation and edition form for the name casings catalog.
 */
@Component({
  selector: 'app-name-casings-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, UiButtonComponent, FormErrorComponent],
  templateUrl: './name-casings-modal.component.html',
  styleUrl: './name-casings-modal.component.scss',
})
export class NameCasingsModalComponent implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);
  private readonly destroyRef = inject(DestroyRef);

  /** Optional data (edit mode). */
  readonly data = input<INameCasingModalData | null>(null);

  /** Determines if modal is in edit mode. */
  protected readonly isEdit = computed(() => !!this.data()?.id);

  /** Helper for translation key generation. */
  protected readonly helper = 'configuration.name-casings.translation';

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
    this.modal.close<INameCasingModalResult>({
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

    this.modal.close<INameCasingModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.form.getRawValue(),
    });
  }
}
