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
 * Action data received by the modal.
 *
 * This contract supports both persisted action fields and auxiliary UI context
 * provided by the parent screen, such as module and controller names used for
 * derived values or display-only calculations.
 */
export interface IActionModalData {
  id?: number;
  name?: string;
  translation?: string;
  icon?: string;
  color?: string;
  priv?: boolean;
  order?: number;
  controller_id?: number;
  moduleName?: string | null;
  controllerName?: string | null;
}

/**
 * Result returned by the action modal after a successful submit.
 */
export interface IActionModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string;
    icon: string;
    color: string;
    priv: boolean;
    order: number;
    controller_id: number;
  };
}

/**
 * Modal used to create or edit configuration actions.
 *
 * Responsibilities:
 * - Receive optional action data from the modal host.
 * - Detect whether the flow is create or edit.
 * - Manage the reactive form for action fields.
 * - Auto-generate the translation key from the action name during creation.
 * - Return a validated payload to the parent screen through the modal service.
 *
 * Notes:
 * - This component does not persist data directly.
 * - API calls are handled by the parent screen after the modal closes.
 */
@Component({
  selector: 'app-action-modal-component',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiButtonComponent,
    FormErrorComponent,
    TranslatePipe,
  ],
  templateUrl: './action-modal-component.html',
  styleUrl: './action-modal-component.scss',
})
export class ActionModalComponent implements AfterViewInit {
  /**
   * Reference to the main name input.
   * Used to focus the field automatically when the modal opens.
   */
  @ViewChild('nameInput') protected nameInput?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Optional action data passed by the modal host.
   *
   * When present, it may include both persisted action fields and auxiliary
   * context values used only inside the modal.
   */
  readonly data = input<IActionModalData | null>(null);

  /**
   * Translation key prefix used when auto-generating values.
   *
   * The prefix is derived from the module and controller names provided by the
   * parent screen. A safe fallback is kept for cases where that auxiliary
   * context is unavailable.
   */
  protected readonly helper = computed(() => {
    const data = this.data();
    const moduleName = data?.moduleName?.trim();
    const controllerName = data?.controllerName?.trim();

    if (moduleName && controllerName) {
      return `${moduleName}.${controllerName}`;
    }

    return 'configuration.actions';
  });

  /**
   * True when the modal is editing an existing action.
   */
  protected readonly isEdit = computed(() => !!this.data()?.id);

  /**
   * Reactive form aligned with the actions payload expected by the screen.
   */
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    translation: ['', [Validators.required, Validators.maxLength(100)]],
    icon: ['', [Validators.required, Validators.maxLength(45)]],
    color: ['', [Validators.required, Validators.maxLength(45)]],
    priv: [false],
    order: [0, [Validators.required, Validators.min(0)]],
    controller_id: [0, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    /**
     * Reactively resets the form whenever the modal input data changes.
     * This supports both create and edit flows.
     */
    effect(() => {
      const action = this.data();

      this.form.reset({
        name: action?.name ?? '',
        translation: action?.translation ?? '',
        icon: action?.icon ?? '',
        color: action?.color ?? '',
        priv: !!action?.priv,
        order: action?.order ?? 0,
        controller_id: action?.controller_id ?? 0,
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

    this.modal.close<IActionModalResult>({
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

    this.form.controls.translation.setValue(`${this.helper()}.${value}`);
  }
}
