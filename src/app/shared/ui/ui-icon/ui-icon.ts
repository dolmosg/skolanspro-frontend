import { Component, computed, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { resolveLucideIconName } from '../../icons/icon-registry';

@Component({
  selector: 'app-ui-icon',
  standalone: true,
  imports: [LucideDynamicIcon],
  templateUrl: './ui-icon.html',
  styleUrl: './ui-icon.scss',
  host: {
    '[class]': 'hostClasses()',
  },
})
export class UiIconComponent {
  name = input<string | null | undefined>(null);
  size = input<'sm' | 'md' | 'lg'>('md');
  tone = input<'default' | 'muted' | 'primary' | 'success' | 'warning' | 'danger'>('default');
  title = input<string | null>(null);

  protected readonly resolvedName = computed(() => {
    return resolveLucideIconName(this.name());
  });

  protected readonly hostClasses = computed(() => {
    return [
      'ui-icon',
      `ui-icon--${this.size()}`,
      `ui-icon--${this.tone()}`,
    ].join(' ');
  });
}