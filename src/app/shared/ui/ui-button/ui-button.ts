import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { UiIconComponent } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-ui-button',
  standalone: true,
  imports: [CommonModule, UiIconComponent],
  templateUrl: './ui-button.html',
  styleUrls: ['./ui-button.scss'],
  host: {
    '[class]': 'hostClasses()',
  },
})
export class UiButtonComponent {
  label = input<string>('');
  title = input<string | null>(null);
  type = input<'button' | 'submit' | 'reset'>('button');
  tooltipPosition = input<'top' | 'bottom'>('top');

  variant = input<'primary' | 'secondary' | 'ghost' | 'danger'>('secondary');
  size = input<'sm' | 'md' | 'lg'>('md');

  iconLeft = input<string | null>(null);
  iconRight = input<string | null>(null);
  iconOnly = input(false);

  disabled = input(false);
  block = input(false);

  protected readonly isIconOnly = computed(() => !!this.iconOnly());

  /**
   * Resolves the native tooltip/title for the button.
   *
   * Rules:
   * - If `title` is explicitly provided, use it.
   * - If the button is icon-only, fall back to `label`.
   * - Otherwise return null so no title attribute is rendered.
   */
  protected readonly resolvedTitle = computed(() => {
    if (this.title()) {
      return this.title();
    }

    if (this.isIconOnly() && this.label()) {
      return this.label();
    }

    return null;
  });

  protected readonly hostClasses = computed(() => {
    return [
      'ui-button',
      `ui-button--${this.variant()}`,
      `ui-button--${this.size()}`,
      this.block() ? 'ui-button--block' : '',
      this.isIconOnly() ? 'ui-button--icon-only' : '',
    ]
      .filter(Boolean)
      .join(' ');
  });
}