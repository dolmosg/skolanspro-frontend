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

export interface IGradebookContentType {
  id: number;
  name: string;
  translation: string | null;
  help_translation?: string | null;
  active: boolean;
  order: number;
}

export interface GradebookTypeContentTypesModalData {
  type: IGradebookType;
  availableContentTypes: IGradebookContentType[];
  selectedContentTypes: IGradebookContentType[];
}

export interface GradebookTypeContentTypesModalResult {
  saved: boolean;
  ids?: number[];
}

interface ContentTypeRow {
  contentType: IGradebookContentType;
  selected: boolean;
}

@Component({
  selector: 'app-gradebook-type-content-types-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe, UiButtonComponent],
  templateUrl: './gradebook-type-content-types-modal.component.html',
  styleUrl: './gradebook-type-content-types-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradebookTypeContentTypesModalComponent {
  private readonly modal = inject(SklModalService);

  readonly data = input<GradebookTypeContentTypesModalData | null>(null);

  protected readonly rows = signal<ContentTypeRow[]>([]);

  protected readonly selectedCount = computed(
    () => this.rows().filter((row) => row.selected).length,
  );
  protected readonly hasRows = computed(() => this.rows().length > 0);
  protected readonly allSelected = computed(
    () => this.hasRows() && this.rows().every((row) => row.selected),
  );

  constructor() {
    effect(() => {
      const data = this.data();

      if (!data) {
        this.rows.set([]);
        return;
      }

      const selectedIds = new Set(data.selectedContentTypes.map((item) => item.id));

      this.rows.set(
        data.availableContentTypes.map((contentType) => ({
          contentType,
          selected: selectedIds.has(contentType.id),
        })),
      );
    });
  }

  protected toggleSelected(row: ContentTypeRow): void {
    this.rows.update((rows) =>
      rows.map((item) =>
        item.contentType.id === row.contentType.id
          ? { ...item, selected: !item.selected }
          : item,
      ),
    );
  }

  protected selectAll(): void {
    this.rows.update((rows) => rows.map((row) => ({ ...row, selected: true })));
  }

  protected clearAll(): void {
    this.rows.update((rows) => rows.map((row) => ({ ...row, selected: false })));
  }

  protected onCancel(): void {
    this.modal.close<GradebookTypeContentTypesModalResult>({ saved: false });
  }

  protected onSubmit(): void {
    this.modal.close<GradebookTypeContentTypesModalResult>({
      saved: true,
      ids: this.rows()
        .filter((row) => row.selected)
        .map((row) => row.contentType.id),
    });
  }

  protected contentTypeLabel(contentType: IGradebookContentType): string {
    return contentType.translation ?? contentType.name;
  }
}
