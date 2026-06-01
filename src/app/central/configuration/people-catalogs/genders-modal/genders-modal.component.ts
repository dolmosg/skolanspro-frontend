import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, computed, DestroyRef, effect, ElementRef, inject, input, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { SklModalService } from '../../../../shared/services/skl-modal-service';
import { FormErrorComponent } from '../../../../shared/ui/form-error/form-error';

/**
 * Data received by the genders modal.
 */
export interface IGenderModalData {
  id?: number;
  name?: string;
  icon?: string;
  translation?: string;
}

/**
 * Result returned to the parent component when the modal is saved.
 */
export interface IGenderModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    icon: string;
    translation: string;
  };
}

/**
 * Genders Modal Component
 * -----------------------
 * Handles the creation and edition form for the genders catalog.
 *
 * This component does not persist data directly. It only validates the form
 * and returns a normalized payload to the parent catalog component.
 */
@Component({
  selector: 'app-genders-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, FormErrorComponent, UiButtonComponent],
  templateUrl: './genders-modal.component.html',
  styleUrl: './genders-modal.component.scss',
})
export class GendersModalComponent implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);
  private readonly destroyRef = inject(DestroyRef);

  /** Main input used to focus the form when the modal opens. */
  @ViewChild('nameInput') private readonly nameInput?: ElementRef<HTMLInputElement>;

  /** Optional gender data. When present, the modal works in edit mode. */
  readonly data = input<IGenderModalData | null>(null);

  /** True when the modal is editing an existing gender. */
  protected readonly isEdit = computed(() => !!this.data()?.id);

  /** Translation key helper used when generating the translation field. */
  protected readonly helper = 'configuration.genders.options';

  /** Reactive form used by the modal. */
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    icon: ['', [Validators.required, Validators.maxLength(45)]],
    translation: ['', [Validators.required, Validators.maxLength(128)]],
  });

  constructor() {

    effect(() => {
      const gender = this.data();

      this.form.reset({
        name: gender?.name ?? '',
        icon: gender?.icon ?? '',
        translation: gender?.translation ?? '',
      });
    });
  }

  /**
   * Focuses the main input after the modal view has been rendered.
   */
  ngAfterViewInit(): void {
    const timer = window.setTimeout(() => {
      this.nameInput?.nativeElement.focus();
    });

    this.destroyRef.onDestroy(() => window.clearTimeout(timer));
  }

  /**
   * Updates the translation key when the name field changes.
   */
  protected onNameChange(): void {
    const value = this.form.controls.name.value.trim();

    if (!value) {
      this.form.controls.translation.setValue('');
      return;
    }

    this.form.controls.translation.setValue(`${this.helper}.${value}`);
  }

  /**
   * Closes the modal without saving changes.
   */
  protected onCancel(): void {
    this.modal.close<IGenderModalResult>({
      saved: false,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.form.getRawValue(),
    });
  }

  /**
   * Validates the form and returns the payload to the parent component.
   */
  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<IGenderModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.form.getRawValue(),
    });
  }
}
