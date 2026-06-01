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
 * Role data received by the modal when editing an existing record.
 */
export interface IRoleModalData {
  id?: number;
  name?: string;
  translation?: string;
  path?: string;
  help?: string;
  internal?: boolean;
}

/**
 * Payload returned by the modal after a successful submit.
 */
export interface IRoleModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string;
    path: string;
    help: string;
    internal: boolean;
  };
}

/**
 * Modal used to create or edit central roles.
 *
 * Responsibilities:
 * - Receive optional role data from the modal host.
 * - Detect whether the flow is create or edit.
 * - Manage the reactive form for role fields.
 * - Auto-generate translation/help keys from the role name during creation.
 * - Return a validated payload to the parent screen through the modal service.
 *
 * Notes:
 * - This component does not persist data directly.
 * - API calls are handled by the parent screen after the modal closes.
 */
@Component({
  selector: 'app-roles-modal-component',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiButtonComponent,
    FormErrorComponent,
    TranslatePipe,
  ],
  templateUrl: './roles-modal-component.html',
  styleUrl: './roles-modal-component.scss',
})
export class RolesModalComponent implements AfterViewInit {
  /**
   * Reference to the main name input.
   * Used to focus the field automatically when the modal opens.
   */
  @ViewChild('nameInput') protected nameInput?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Optional role data passed by the modal host.
   * If present, the modal behaves as edit mode.
   */
  readonly data = input<IRoleModalData | null>(null);

  /**
   * Translation/helper key prefix used when auto-generating values.
   */
  protected readonly helper = 'configuration.roles';

  /**
   * True when the modal is editing an existing role.
   */
  protected readonly isEdit = computed(() => !!this.data()?.id);

  /**
   * Reactive form aligned with the physical database structure.
   */
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    translation: ['', [Validators.required, Validators.maxLength(200)]],
    path: ['', [Validators.required, Validators.maxLength(200)]],
    help: ['', [Validators.required, Validators.maxLength(200)]],
    internal: [false],
  });

  constructor() {
    /**
     * Reactively resets the form whenever the modal input data changes.
     * This supports both create and edit flows.
     */
    effect(() => {
      const role = this.data();

      this.form.reset({
        name: role?.name ?? '',
        translation: role?.translation ?? '',
        path: role?.path ?? '',
        help: role?.help ?? '',
        internal: role?.internal ?? false,
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

    this.modal.close<IRoleModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload,
    });
  }

  /**
   * Auto-generates translation/help keys from the name field during creation.
   * In edit mode, existing values are preserved.
   */
  protected onNameChange(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value?.trim() ?? '';

    if (this.isEdit()) {
      return;
    }

    if (!value) {
      this.form.controls.translation.setValue('');
      this.form.controls.help.setValue('');
      return;
    }

    this.form.controls.translation.setValue(`${this.helper}.translation.${value}`);
    this.form.controls.help.setValue(`${this.helper}.helpers.${value}`);
  }
}
