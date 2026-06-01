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
 * Controller data received by the modal when editing an existing record.
 */
export interface IControllerModalData {
  id?: number;
  name?: string;
  translation?: string;
  path?: string;
  priv?: boolean;
  visible?: boolean;
  icon?: string;
  order?: number;
  context?: 'central' | 'tenant' | 'both';
  parent_id?: number | null;
  module_id?: number;
}

/**
 * Result returned by the controller modal after a successful submit.
 */
export interface IControllerModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string;
    priv: boolean;
    visible: boolean;
    icon: string;
    order: number;
    context: 'central' | 'tenant' | 'both';
    parent_id: number | null;
    module_id: number;
  };
}

/**
 * Modal used to create or edit configuration controllers.
 *
 * Responsibilities:
 * - Receive optional controller data from the modal host.
 * - Detect whether the flow is create or edit.
 * - Manage the reactive form for controller fields.
 * - Auto-generate translation and path from the controller name during creation.
 * - Return a validated payload to the parent screen through the modal service.
 *
 * Notes:
 * - This component does not persist data directly.
 * - API calls are handled by the parent screen after the modal closes.
 */
@Component({
  selector: 'app-controller-modal-component',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiButtonComponent,
    FormErrorComponent,
    TranslatePipe,
  ],
  templateUrl: './controller-modal-component.html',
  styleUrl: './controller-modal-component.scss',
})
export class ControllerModalComponent implements AfterViewInit {
  /**
   * Reference to the main name input.
   * Used to focus the field automatically when the modal opens.
   */
  @ViewChild('nameInput') protected nameInput?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Optional controller data passed by the modal host.
   * If present, the modal behaves as edit mode.
   */
  readonly data = input<IControllerModalData | null>(null);

  /**
   * Translation/helper key prefix used when auto-generating values.
   */
  protected readonly helper = 'controllers';

  /**
   * True when the modal is editing an existing controller.
   */
  protected readonly isEdit = computed(() => !!this.data()?.id);

  /**
   * Reactive form aligned with the controllers payload expected by the screen.
   */
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    translation: ['', [Validators.required, Validators.maxLength(100)]],
    priv: [false],
    visible: [true],
    icon: ['', [Validators.required, Validators.maxLength(45)]],
    order: [0, [Validators.required, Validators.min(0)]],
    context: this.fb.nonNullable.control<'central' | 'tenant' | 'both'>('tenant', Validators.required),
    parent_id: this.fb.control<number | null>(null),
    module_id: [0, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    /**
     * Reactively resets the form whenever the modal input data changes.
     * This supports both create and edit flows.
     */
    effect(() => {
      const controller = this.data();

      this.form.reset({
        name: controller?.name ?? '',
        translation: controller?.translation ?? '',
        priv: !!controller?.priv,
        visible: controller?.visible ?? true,
        icon: controller?.icon ?? '',
        order: controller?.order ?? 0,
        context: controller?.context ?? 'tenant',
        parent_id: controller?.parent_id ?? null,
        module_id: controller?.module_id ?? 0,
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

    this.modal.close<IControllerModalResult>({
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
