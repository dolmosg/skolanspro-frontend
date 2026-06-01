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

import { SklModalService } from '../../../shared/services/skl-modal-service';
import { FormErrorComponent } from '../../../shared/ui/form-error/form-error';
import { UiButtonComponent } from '../../../shared/ui/ui-button/ui-button';

/**
 * Module data received by the modal when editing an existing record.
 */
export interface IModuleModalData {
  id?: number;
  name?: string;
  translation?: string;
  priv?: boolean;
  icon?: string;
  order?: number;
  context?: 'central' | 'tenant' | 'both';
}

/**
 * Result returned by the module modal after a successful submit.
 */
export interface IModuleModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string;
    priv: boolean;
    icon: string;
    order: number;
    context: 'central' | 'tenant' | 'both';
  };
}

/**
 * Modal used to create or edit central modules.
 *
 * Responsibilities:
 * - Receive optional module data from the modal host.
 * - Detect whether the flow is create or edit.
 * - Manage the reactive form for module fields.
 * - Auto-generate the translation key from the module name during creation.
 * - Return a validated payload to the parent screen through the modal service.
 *
 * Notes:
 * - This component does not persist data directly.
 * - API calls are handled by the parent screen after the modal closes.
 */
@Component({
  selector: 'app-module-modal-component',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiButtonComponent,
    FormErrorComponent,
    TranslatePipe,
  ],
  templateUrl: './module-modal-component.html',
  styleUrl: './module-modal-component.scss',
})
export class ModuleModalComponent implements AfterViewInit {
  /**
   * Reference to the main name input.
   * Used to focus the field automatically when the modal opens.
   */
  @ViewChild('nameInput') protected nameInput?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Optional module data passed by the modal host.
   * If present, the modal behaves as edit mode.
   */
  readonly data = input<IModuleModalData | null>(null);

  /**
   * Translation key prefix used when auto-generating values.
   */
  protected readonly helper = 'modules';

  /**
   * True when the modal is editing an existing module.
   */
  protected readonly isEdit = computed(() => !!this.data()?.id);

  /**
   * Reactive form aligned with the payload expected by the screen.
   */
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    translation: ['', [Validators.required, Validators.maxLength(200)]],
    priv: [false],
    icon: ['', [Validators.required, Validators.maxLength(45)]],
    order: [0, [Validators.required, Validators.min(0)]],
    context: this.fb.nonNullable.control<'central' | 'tenant' | 'both'>('tenant', Validators.required),
  });

  constructor() {
    /**
     * Reactively resets the form whenever the modal input data changes.
     * This supports both create and edit flows.
     */
    effect(() => {
      const module = this.data();

      this.form.reset({
        name: module?.name ?? '',
        translation: module?.translation ?? '',
        priv: !!module?.priv,
        icon: module?.icon ?? '',
        order: module?.order ?? 0,
        context: module?.context ?? 'tenant',
      });
    });
  }

  /**
   * Focuses the name input once the modal view is fully rendered.
   *
   * A small timeout is used because the modal is mounted dynamically.
   */
  ngAfterViewInit(): void {
    const timer = window.setTimeout(() => {
      this.nameInput?.nativeElement.focus();
    });

    this.destroyRef.onDestroy(() => window.clearTimeout(timer));
  }

  /**
   * Closes the modal without returning a saved result.
   */
  protected onCancel(): void {
    this.modal.close(null);
  }

  /**
   * Validates the form and returns a normalized payload to the caller.
   * Persistence is handled by the parent screen, not by the modal itself.
   */
  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();

    this.modal.close<IModuleModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload,
    });
  }

  /**
   * Auto-generates the translation key from the name field during creation.
   * In edit mode, existing values are preserved.
   */
  protected onNameChange(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value?.trim() ?? '';

    if (this.isEdit()) {
      return;
    }

    if (!value) {
      this.form.controls.translation.setValue('');
      return;
    }

    this.form.controls.translation.setValue(`${this.helper}.${value}`);
  }
}
