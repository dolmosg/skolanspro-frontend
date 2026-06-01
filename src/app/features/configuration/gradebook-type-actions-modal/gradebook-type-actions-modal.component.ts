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

export interface IGradebookAction {
  id: number;
  name: string;
  translation: string | null;
  icon: string | null;
  color: string | null;
  active: boolean;
  order: number;
}

export interface IGradebookTypeAction {
  id?: number;
  gradebook_type_id: number;
  gradebook_action_id: number;
  active: boolean;
  order: number;
}

export interface GradebookTypeActionsModalData {
  type: IGradebookType;
  availableActions: IGradebookAction[];
  selectedActions: IGradebookTypeAction[];
}

export interface GradebookTypeActionsModalResult {
  saved: boolean;
  items?: IGradebookTypeAction[];
}

interface ActionRow {
  action: IGradebookAction;
  selected: boolean;
  active: boolean;
  order: number;
}

@Component({
  selector: 'app-gradebook-type-actions-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe, UiButtonComponent],
  templateUrl: './gradebook-type-actions-modal.component.html',
  styleUrl: './gradebook-type-actions-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradebookTypeActionsModalComponent {
  private readonly modal = inject(SklModalService);

  readonly data = input<GradebookTypeActionsModalData | null>(null);

  protected readonly rows = signal<ActionRow[]>([]);
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
      const name = row.action.name.toLowerCase();
      const translation = row.action.translation?.toLowerCase() ?? '';

      return name.includes(term) || translation.includes(term);
    });
  });

  protected readonly hasRows = computed(() => this.rows().length > 0);
  protected readonly hasVisibleRows = computed(() => this.filteredRows().length > 0);

  constructor() {
    effect(() => {
      const data = this.data();

      if (!data) {
        this.rows.set([]);
        return;
      }

      const selectedMap = new Map(
        data.selectedActions.map((item) => [item.gradebook_action_id, item]),
      );

      this.rows.set(
        data.availableActions.map((action, index) => {
          const selected = selectedMap.get(action.id);

          return {
            action,
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

  protected toggleSelected(row: ActionRow): void {
    this.rows.update((rows) =>
      rows.map((item) =>
        item.action.id === row.action.id
          ? {
              ...item,
              selected: !item.selected,
              active: !item.selected ? true : item.active,
            }
          : item,
      ),
    );
  }

  protected toggleActive(row: ActionRow): void {
    this.rows.update((rows) =>
      rows.map((item) =>
        item.action.id === row.action.id
          ? {
              ...item,
              active: !item.active,
            }
          : item,
      ),
    );
  }

  protected onCancel(): void {
    this.modal.close<GradebookTypeActionsModalResult>({
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
      gradebook_action_id: row.action.id,
      active: row.active,
      order: index,
    }));

    this.modal.close<GradebookTypeActionsModalResult>({
      saved: true,
      items,
    });
  }

  protected actionLabel(action: IGradebookAction): string {
    return action.translation ?? action.name;
  }

  protected buttonVariant(
    color: string | null | undefined,
  ): 'primary' | 'secondary' | 'ghost' | 'danger' {
    if (color === 'primary' || color === 'secondary' || color === 'ghost' || color === 'danger') {
      return color;
    }

    return 'secondary';
  }
}
