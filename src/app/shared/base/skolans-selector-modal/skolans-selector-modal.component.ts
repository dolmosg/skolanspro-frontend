import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { SklModalService } from '@shared/services/skl-modal-service';
import { FormErrorComponent } from '@shared/ui/form-error/form-error';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

/**
 * Generic option item used by the selector modal.
 *
 * The modal intentionally only understands an id and a human-readable descriptor
 * so it can be reused across modules without importing feature-specific models.
 */
export interface SkolansSelectorModalItem {
  id: number | null;
  descriptor: string;
}

/**
 * Data received by the reusable selector modal.
 */
export interface SkolansSelectorModalData {
  title?: string;
  description?: string;
  required?: boolean;
  items: SkolansSelectorModalItem[];
  selectedId?: number | null;
  placeholder?: string;
}

/**
 * Result returned by the selector modal.
 */
export interface SkolansSelectorModalResult {
  confirmed: boolean;
  selectedId: number | null;
}

/**
 * Generic selector modal.
 *
 * Responsibilities:
 * - Receive a title, description, item list, and optional selected id.
 * - Render a required SkSelectComponent.
 * - Validate that one option is selected.
 * - Return only the selected id to the parent screen.
 *
 * Notes:
 * - This component does not call APIs.
 * - The parent screen owns persistence and business behavior.
 */
@Component({
  selector: 'app-skolans-selector-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SkSelectComponent,
    FormErrorComponent,
    UiButtonComponent,
  ],
  templateUrl: './skolans-selector-modal.component.html',
  styleUrl: './skolans-selector-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkolansSelectorModalComponent {
  private readonly modal = inject(SklModalService);

  readonly data = input<SkolansSelectorModalData | null>(null);

  protected readonly selectedIdControl = new FormControl<number | null>(null);

  protected readonly title = computed(() => this.data()?.title ?? '');
  protected readonly description = computed(() => this.data()?.description ?? '');
  protected readonly items = computed(() => this.data()?.items ?? []);
  protected readonly placeholder = computed(
    () => this.data()?.placeholder ?? 'Selecciona una opción',
  );

  constructor() {
    effect(() => {
      const data = this.data();

      this.selectedIdControl.setValue(data?.selectedId ?? null);

      if (data?.required === false) {
        this.selectedIdControl.clearValidators();
      } else {
        this.selectedIdControl.setValidators([Validators.required]);
      }

      this.selectedIdControl.updateValueAndValidity({ emitEvent: false });
      this.selectedIdControl.markAsPristine();
      this.selectedIdControl.markAsUntouched();
    });
  }

  /**
   * Closes the modal without confirming a selection.
   */
  protected onCancel(): void {
    this.modal.close<SkolansSelectorModalResult>({
      confirmed: false,
      selectedId: null,
    });
  }

  /**
   * Validates the selection and returns the selected id.
   */
  protected onSubmit(): void {
    if (this.selectedIdControl.invalid) {
      this.selectedIdControl.markAsTouched();
      return;
    }

    this.modal.close<SkolansSelectorModalResult>({
      confirmed: true,
      selectedId: this.selectedIdControl.value,
    });
  }
}
