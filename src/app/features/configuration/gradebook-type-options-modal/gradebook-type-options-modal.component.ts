import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { IGradebookType } from '../gradebook-types/gradebook-types.component';

export interface IGradebookOption {
  id: number;
  name: string;
  translation: string | null;
  active: boolean;
  order: number;
}

export interface IGradebookTypeOption {
  id?: number;
  gradebook_type_id: number;
  gradebook_option_id: number;
  active: boolean;
  order: number;
}

export interface GradebookTypeOptionsModalData {
  type: IGradebookType;
  availableOptions: IGradebookOption[];
  selectedOptions: IGradebookTypeOption[];
}

export interface GradebookTypeOptionsModalResult {
  saved: boolean;
  items?: IGradebookTypeOption[];
}

interface OptionRow {
  option: IGradebookOption;
  selected: boolean;
  active: boolean;
  order: number;
}

@Component({
  selector: 'app-gradebook-type-options-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe, UiButtonComponent],
  templateUrl: './gradebook-type-options-modal.component.html',
  styleUrl: './gradebook-type-options-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradebookTypeOptionsModalComponent {
  private readonly modal = inject(SklModalService);

  readonly data = input<GradebookTypeOptionsModalData | null>(null);

  protected readonly rows = signal<OptionRow[]>([]);
  protected readonly search = signal('');

  protected readonly type = computed(() => this.data()?.type ?? null);

  protected readonly selectedRows = computed(() =>
    this.rows()
      .filter((row) => row.selected)
      .sort((a, b) => a.order - b.order),
  );

  protected readonly selectedCount = computed(() => this.selectedRows().length);

  protected readonly filteredRows = computed(() => {
    const term = this.search().trim().toLowerCase();

    if (!term) {
      return this.rows();
    }

    return this.rows().filter((row) => {
      const name = row.option.name.toLowerCase();
      const translation = row.option.translation?.toLowerCase() ?? '';

      return name.includes(term) || translation.includes(term);
    });
  });

  protected readonly hasRows = computed(() => this.rows().length > 0);
  protected readonly hasVisibleRows = computed(() => this.filteredRows().length > 0);
  protected readonly allVisibleSelected = computed(() => {
    const visible = this.filteredRows();

    return visible.length > 0 && visible.every((row) => row.selected);
  });

  constructor() {
    effect(() => {
      const data = this.data();

      if (!data) {
        this.rows.set([]);
        return;
      }

      const selectedMap = new Map(
        data.selectedOptions.map((item) => [item.gradebook_option_id, item]),
      );

      this.rows.set(
        data.availableOptions.map((option, index) => {
          const selected = selectedMap.get(option.id);

          return {
            option,
            selected: !!selected,
            active: selected?.active ?? true,
            order: selected?.order ?? index,
          };
        }),
      );
    });
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.search.set(value);
  }

  protected clearSearch(): void {
    this.search.set('');
  }

  protected toggleSelected(row: OptionRow): void {
    this.rows.update((rows) => {
      const isSelecting = !row.selected;
      const nextOrder = this.nextSelectedOrder(rows);

      return rows.map((item) =>
        item.option.id === row.option.id
          ? {
              ...item,
              selected: isSelecting,
              active: isSelecting ? true : item.active,
              order: isSelecting ? nextOrder : item.order,
            }
          : item,
      );
    });

    this.normalizeSelectedOrder();
  }

  protected toggleActive(row: OptionRow): void {
    this.rows.update((rows) =>
      rows.map((item) =>
        item.option.id === row.option.id
          ? {
              ...item,
              active: !item.active,
            }
          : item,
      ),
    );
  }

  protected selectAllVisible(): void {
    this.rows.update((rows) => {
      const visibleIds = new Set(this.filteredRows().map((row) => row.option.id));
      let nextOrder = this.nextSelectedOrder(rows);

      return rows.map((row) => {
        if (!visibleIds.has(row.option.id) || row.selected) {
          return row;
        }

        return {
          ...row,
          selected: true,
          active: true,
          order: nextOrder++,
        };
      });
    });

    this.normalizeSelectedOrder();
  }

  protected clearVisible(): void {
    const visibleIds = new Set(this.filteredRows().map((row) => row.option.id));

    this.rows.update((rows) =>
      rows.map((row) =>
        visibleIds.has(row.option.id)
          ? {
              ...row,
              selected: false,
            }
          : row,
      ),
    );

    this.normalizeSelectedOrder();
  }

  protected moveUp(row: OptionRow): void {
    this.moveSelected(row, -1);
  }

  protected moveDown(row: OptionRow): void {
    this.moveSelected(row, 1);
  }

  protected canMoveUp(row: OptionRow): boolean {
    return row.selected && this.selectedRows().findIndex((item) => item.option.id === row.option.id) > 0;
  }

  protected canMoveDown(row: OptionRow): boolean {
    const index = this.selectedRows().findIndex((item) => item.option.id === row.option.id);

    return row.selected && index >= 0 && index < this.selectedRows().length - 1;
  }

  protected onCancel(): void {
    this.modal.close<GradebookTypeOptionsModalResult>({
      saved: false,
    });
  }

  protected onSubmit(): void {
    const type = this.type();

    if (!type) {
      return;
    }

    const items = this.selectedRows().map((row, index) => ({
      gradebook_type_id: type.id,
      gradebook_option_id: row.option.id,
      active: row.active,
      order: index,
    }));

    this.modal.close<GradebookTypeOptionsModalResult>({
      saved: true,
      items,
    });
  }

  protected optionLabel(option: IGradebookOption): string {
    return option.translation ?? option.name;
  }

  private nextSelectedOrder(rows: OptionRow[]): number {
    const selected = rows.filter((row) => row.selected);

    if (!selected.length) {
      return 0;
    }

    return Math.max(...selected.map((row) => row.order)) + 1;
  }

  private normalizeSelectedOrder(): void {
    this.rows.update((rows) => {
      const selectedIds = rows
        .filter((row) => row.selected)
        .sort((a, b) => a.order - b.order)
        .map((row) => row.option.id);

      const orderMap = new Map(selectedIds.map((id, index) => [id, index]));

      return rows.map((row) => ({
        ...row,
        order: row.selected ? orderMap.get(row.option.id) ?? row.order : row.order,
      }));
    });
  }

  private moveSelected(row: OptionRow, direction: -1 | 1): void {
    const selected = this.selectedRows();
    const currentIndex = selected.findIndex((item) => item.option.id === row.option.id);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= selected.length) {
      return;
    }

    const reordered = [...selected];
    const [moved] = reordered.splice(currentIndex, 1);

    reordered.splice(nextIndex, 0, moved);

    const orderMap = new Map(reordered.map((item, index) => [item.option.id, index]));

    this.rows.update((rows) =>
      rows.map((item) => ({
        ...item,
        order: item.selected ? orderMap.get(item.option.id) ?? item.order : item.order,
      })),
    );
  }
}