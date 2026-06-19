import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-ui-meta-item',
  standalone: true,
  imports: [],
  templateUrl: './ui-meta-item.component.html',
  styleUrl: './ui-meta-item.component.scss',
})
export class UiMetaItemComponent {
  readonly label = input.required<string>();
  readonly help = input<string | null>(null);
  readonly muted = input(false);
  readonly tooltipPosition = input<'top' | 'bottom'>('top');

  protected readonly resolvedHelp = computed(() => this.help() || null);
}
