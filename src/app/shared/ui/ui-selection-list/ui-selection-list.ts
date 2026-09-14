import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type UiSelectionId = number | string;

export interface UiSelectionItem {
  id: UiSelectionId;
  code?: string;
  name: string;
}

@Component({
  selector: 'app-ui-selection-list',
  templateUrl: './ui-selection-list.html',
  styleUrl: './ui-selection-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiSelectionListComponent {
  readonly items = input<UiSelectionItem[]>([]);
  readonly selectedIds = input<ReadonlySet<UiSelectionId>>(new Set());
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly emptyText = input.required<string>();
  readonly selectionChange = output<{ id: UiSelectionId; checked: boolean }>();
  protected change(id: UiSelectionId, event: Event): void {
    this.selectionChange.emit({ id, checked: (event.target as HTMLInputElement).checked });
  }
}
