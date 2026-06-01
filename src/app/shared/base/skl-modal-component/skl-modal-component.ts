import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, input, output } from '@angular/core';

export type SklModalSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * SklModalComponent
 * -----------------
 * Base reusable modal shell for Skolans.
 *
 * Responsibilities:
 * - Render a modal container with configurable size
 * - Expose title and description metadata
 * - Allow close interactions through backdrop, ESC key and close button
 * - Emit a normalized close event so parent components can react
 *
 * Notes:
 * - The visual structure will be completed in the HTML/SCSS files.
 * - Content projection will be handled in the template.
 */
@Component({
  selector: 'app-skl-modal-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skl-modal-component.html',
  styleUrl: './skl-modal-component.scss',
  host: {
    'class': 'skl-modal-host',
    '[attr.data-size]': 'size()',
    '[attr.aria-modal]': 'true',
    '[attr.role]': '"dialog"',
    '[attr.aria-labelledby]': 'titleId()',
    '[attr.aria-describedby]': 'descriptionId()',
  },
})
export class SklModalComponent {
  /** Main modal title. */
  readonly title = input<string>('');

  /** Optional modal description shown below the title. */
  readonly description = input<string>('');

  /** Modal size variant. */
  readonly size = input<SklModalSize>('md');

  /** Whether clicking the backdrop should close the modal. */
  readonly closeOnBackdrop = input(true);

  /** Whether pressing Escape should close the modal. */
  readonly closeOnEscape = input(true);

  /** Whether the close button should be shown in the header. */
  readonly showCloseButton = input(true);

  /** Whether the modal is in a busy state. */
  readonly busy = input(false);

  /** Emitted whenever the modal requests to close. */
  readonly closed = output<void>();

  /** Stable id used to link the dialog title for accessibility. */
  protected readonly titleId = computed(() => 'skl-modal-title');

  /** Stable id used to link the dialog description for accessibility. */
  protected readonly descriptionId = computed(() => 'skl-modal-description');

  /** True when the modal currently has a visible description. */
  protected readonly hasDescription = computed(() => !!this.description().trim());

  protected onModalDataReceived(data: any): void {}

  /**
   * Closes the modal unless it is currently busy.
   */
  close(): void {
    if (this.busy()) {
      return;
    }

    this.closed.emit();
  }

  /**
   * Handles backdrop clicks according to the configured behavior.
   */
  onBackdropClick(): void {
    if (!this.closeOnBackdrop()) {
      return;
    }

    this.close();
  }

  /**
   * Prevents backdrop click handlers from firing when the dialog panel itself is clicked.
   */
  onPanelClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  /**
   * Closes the modal with Escape when enabled.
   */
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (!this.closeOnEscape()) {
      return;
    }

    this.close();
  }
}
