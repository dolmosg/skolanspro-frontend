import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  RowClickedEvent,
  RowDragEndEvent,
  RowDragMoveEvent,
  RowSelectionOptions,
  SelectionChangedEvent,
} from 'ag-grid-community';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AgGridAngular } from 'ag-grid-angular';
import { fromEvent } from 'rxjs';

export type SkolansTableSelectionMode = 'none' | 'single' | 'multiple';

/**
 * SkolansTable
 * ------------
 * Reusable AG Grid wrapper used across SkolansPro screens.
 *
 * This component centralizes the table behavior required by catalogs, dashboards,
 * ordering screens, and future data-heavy views.
 *
 * Responsibilities:
 * - Render AG Grid with a consistent visual and behavioral configuration.
 * - Receive column definitions and row data from parent screens.
 * - Support controlled row selection (`none`, `single`, `multiple`).
 * - Emit normalized selection, click, and row drag events.
 * - Keep AG Grid overlays synchronized with loading and empty states.
 * - Refresh headers and cells when the active language changes.
 * - Reapply grid state safely when inputs change after initialization.
 *
 * Height strategy:
 * - `height="fill"` is the recommended mode for full-page catalog layouts.
 *   It calculates a concrete pixel height from the nearest layout container.
 * - Fixed CSS heights such as `height="420px"` are supported for modals,
 *   cards, tabs, or screens that need explicit sizing.
 * - Percentage heights are discouraged because AG Grid with `domLayout='normal'`
 *   requires a concrete rendered height and parent percentage chains are fragile.
 */
@Component({
  selector: 'app-skolans-table',
  standalone: true,
  imports: [CommonModule, AgGridAngular, TranslatePipe],
  templateUrl: './skolans-table.html',
  styleUrl: './skolans-table.scss',
})
export class SkolansTable implements OnChanges {
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);

  /** Column definitions */
  @Input() columnDefs: ColDef[] = [];

  /** Row data */
  @Input() rowData: unknown[] = [];

  /** Loading state */
  @Input() loading = false;

  /** Selection mode */
  @Input() selectionMode: SkolansTableSelectionMode = 'none';

  /** Empty message key */
  @Input() emptyMessage = 'common.no-data';

  /**
   * CSS height applied to the AG Grid host.
   *
   * Supported modes:
   * - `fill`: calculates a concrete pixel height based on the available layout space.
   * - `auto`: maps to `100%` and depends on the parent layout.
   * - fixed values like `420px`: passed directly to AG Grid.
   *
   * Avoid percentage values such as `50%` unless every parent has a guaranteed
   * explicit height. For most catalog pages, prefer `fill`.
   */
  @Input() height: string = '100%';

  /** Enables AG Grid pagination. */
  @Input() pagination = false;

  /** Forces the pagination panel to remain visible. */
  @Input() alwaysShowPagination = false;

  /** Page size used when pagination is enabled. */
  @Input() pageSize = 10;

  /** Enables row drag mode for manual ordering flows. */
  @Input() enableRowDrag = false;

  /** Uses AG Grid managed row dragging when enabled. */
  @Input() rowDragManaged = false;

  /** Prevents rows from moving visually until the drag is completed. */
  @Input() suppressMoveWhenRowDragging = true;

  /** Optional row ID extractor used by AG Grid to keep row state stable. */
  @Input() getRowId?: (params: GetRowIdParams) => string;

  /** Outputs */
  @Output() gridReady = new EventEmitter<GridReadyEvent>();
  @Output() selectionChange = new EventEmitter<unknown[]>();
  @Output() rowClicked = new EventEmitter<unknown>();
  @Output() rowDragMove = new EventEmitter<RowDragMoveEvent>();
  @Output() rowDragEnd = new EventEmitter<unknown[]>();

  /** Default column behavior */
  protected readonly defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: false,
    floatingFilter: false,
  };

  /**
   * AG Grid row selection configuration.
   *
   * The object form avoids deprecated string values and keeps click-selection
   * disabled because this wrapper manages row click selection manually.
   */
  protected readonly rowSelection = computed<RowSelectionOptions | undefined>(() => {
    switch (this.selectionMode) {
      case 'single':
        return {
          mode: 'singleRow',
          enableClickSelection: false,
          checkboxes: false,
          headerCheckbox: false,
        };
      case 'multiple':
        return {
          mode: 'multiRow',
          enableClickSelection: false,
          checkboxes: false,
          headerCheckbox: false,
        };
      default:
        return undefined;
    }
  });

  /**
   * Inline style used by the AG Grid host element.
   *
   * AG Grid is rendered with `domLayout='normal'`, which means the grid must
   * receive an explicit rendered height. For `height="fill"`, this component
   * supplies a computed pixel value through `resolvedHeight`. For fixed values,
   * the provided height is passed directly to the grid.
   */
  protected readonly tableStyle = computed(() => {
    const requestedHeight = this.height?.trim() || '100%';

    if (requestedHeight === 'fill') {
      return {
        width: '100%',
        height: this.resolvedHeight(),
      };
    }

    const normalizedHeight = requestedHeight === 'auto' ? '100%' : requestedHeight;

    return {
      width: '100%',
      height: normalizedHeight,
    };
  });

  private readonly gridApi = signal<GridApi | null>(null);
  private readonly internalRowData = signal<unknown[]>([]);
  /**
   * Resolved pixel height used by `height="fill"`.
   *
   * This value is intentionally stored in a signal because DOM measurements are
   * not reactive by themselves. It is recalculated on grid initialization,
   * height input changes, and viewport resize.
   */
  private readonly resolvedHeight = signal('400px');

  /** Pending animation frame used to batch height recalculation. */
  private frameId: number | null = null;

  constructor() {
    this.listenToLanguageChanges();
    this.listenToViewportChanges();

    this.destroyRef.onDestroy(() => {
      if (this.frameId !== null) {
        cancelAnimationFrame(this.frameId);
      }
    });
  }

  /**
   * React to input changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    const api = this.gridApi();

    if (!api) return;

    if (changes['height']) {
      this.scheduleHeightSync();
    }

    if (changes['columnDefs']) {
      api.setGridOption('columnDefs', this.columnDefs);
      api.refreshHeader();
    }

    if (changes['selectionMode']) {
      api.setGridOption('rowSelection', this.rowSelection());
    }

    if (changes['rowData']) {
      this.internalRowData.set([...(this.rowData ?? [])]);
      api.setGridOption('rowData', this.internalRowData());
      api.refreshCells({ force: true });
    }

    if (changes['pagination'] || changes['pageSize'] || changes['alwaysShowPagination']) {
      this.syncPaginationState(api);
    }

    if (
      changes['enableRowDrag'] ||
      changes['rowDragManaged'] ||
      changes['suppressMoveWhenRowDragging']
    ) {
      api.setGridOption('rowDragManaged', this.enableRowDrag && this.rowDragManaged);
      api.setGridOption('suppressMoveWhenRowDragging', this.suppressMoveWhenRowDragging);
    }

    if (changes['loading'] || changes['rowData']) {
      this.syncOverlay();
    }
  }

  /**
   * Grid ready
   */
  onGridReady(event: GridReadyEvent): void {
    this.gridApi.set(event.api);
    this.gridReady.emit(event);
    this.syncGridState();
    this.scheduleHeightSync();
  }

  /**
   * Selection change
   */
  onSelectionChanged(event: SelectionChangedEvent): void {
    this.selectionChange.emit(event.api.getSelectedRows());
  }

  /**
   * Row click
   *
   * The wrapper owns click-based selection so screens get predictable behaviour:
   * - single mode toggles the clicked row on/off
   * - multiple mode toggles the clicked row independently
   */
  onRowClicked(event: RowClickedEvent): void {
    const node = event.node;
    const api = event.api;

    if (this.selectionMode === 'single') {
      const selectedRows = api.getSelectedRows();
      const clickedData = event.data;
      const isSameSelectedRow = selectedRows.length === 1 && selectedRows[0] === clickedData;

      if (isSameSelectedRow) {
        api.deselectAll();
      } else {
        node.setSelected(true, true);
      }

      this.selectionChange.emit(api.getSelectedRows());
    } else if (this.selectionMode === 'multiple') {
      node.setSelected(!node.isSelected());
      this.selectionChange.emit(api.getSelectedRows());
    }

    this.rowClicked.emit(event.data);
  }

  /**
   * Emits low-level drag move events so parent screens can react when needed.
   */
  onRowDragMove(event: RowDragMoveEvent): void {
    this.rowDragMove.emit(event);
  }

  /**
   * Emits the current row order after a drag operation finishes.
   *
   * This is especially useful for catalog screens that persist ordering in the backend.
   */
  onRowDragEnd(event: RowDragEndEvent): void {
    const api = event.api;
    const orderedRows: unknown[] = [];

    api.forEachNode((node) => {
      if (node.data) {
        orderedRows.push(node.data);
      }
    });

    this.internalRowData.set(orderedRows);
    this.rowDragEnd.emit(orderedRows);
  }

  /**
   * Listen language changes (GLOBAL responsibility now)
   */
  private listenToLanguageChanges(): void {
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshTranslations());
  }

  /**
   * Apply current inputs to grid
   */
  private syncGridState(): void {
    const api = this.gridApi();

    if (!api) return;

    api.setGridOption('columnDefs', this.columnDefs);
    api.setGridOption('rowSelection', this.rowSelection());
    this.internalRowData.set([...(this.rowData ?? [])]);
    api.setGridOption('rowData', this.internalRowData());
    api.setGridOption('rowDragManaged', this.enableRowDrag && this.rowDragManaged);
    api.setGridOption('suppressMoveWhenRowDragging', this.suppressMoveWhenRowDragging);
    this.syncPaginationState(api);

    this.refreshTranslations();
    this.syncOverlay();
  }

  /**
   * Reacts to viewport resizing so `fill` mode can keep AG Grid height in pixels.
   *
   * Without this, resizing the browser would leave the grid with a stale height.
   */
  private listenToViewportChanges(): void {
    if (typeof window === 'undefined') {
      return;
    }

    fromEvent(window, 'resize')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.scheduleHeightSync());
  }

  /**
   * Batches height recalculation into the next animation frame.
   *
   * Layout measurements are safest after the browser has had a chance to apply
   * pending DOM updates. This avoids measuring the table before surrounding
   * toolbars, selection badges, or layout containers have settled.
   */
  private scheduleHeightSync(): void {
    if ((this.height?.trim() || '100%') !== 'fill') {
      return;
    }

    if (typeof window === 'undefined') {
      this.resolvedHeight.set('400px');
      return;
    }

    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
    }

    this.frameId = window.requestAnimationFrame(() => {
      this.frameId = null;
      this.syncResolvedHeight();
    });
  }

  /**
   * Computes a real pixel height for AG Grid when `height="fill"`.
   *
   * The calculation uses the nearest known layout container and measures the
   * remaining visible space from the table top to the container bottom:
   *
   *   resolvedHeight = container.bottom - table.top - safetyOffset
   *
   * This keeps local toolbars visible, prevents the page footer from being
   * pushed away, and gives AG Grid the concrete pixel height it requires.
   */
  private syncResolvedHeight(): void {
    const safetyOffset = 8;
    const hostElement = this.host.nativeElement;
    const hostRect = hostElement.getBoundingClientRect();

    const layoutContainer =
      hostElement.closest('.shell__content-body') ??
      hostElement.closest('.sk-page__panel') ??
      hostElement.parentElement;

    const containerRect = layoutContainer?.getBoundingClientRect();

    if (containerRect) {
      const nextHeight = Math.max(300, Math.floor(containerRect.bottom - hostRect.top - safetyOffset));
      this.resolvedHeight.set(`${nextHeight}px`);
      return;
    }

    const viewportHeight = window.innerHeight;
    const nextHeight = Math.max(300, Math.floor(viewportHeight - hostRect.top - 24));

    this.resolvedHeight.set(`${nextHeight}px`);
  }

  /**
   * Applies pagination-related options in one place.
   *
   * Keeping these options centralized avoids inconsistent pagination behavior
   * across screens and prevents repeated AG Grid option wiring in parent views.
   */
  private syncPaginationState(api: GridApi): void {
    api.setGridOption('pagination', this.pagination);
    api.setGridOption('paginationPageSize', this.pageSize);
    api.setGridOption('suppressPaginationPanel', !this.pagination && !this.alwaysShowPagination);
  }

  /**
   * Force refresh for translations
   */
  private refreshTranslations(): void {
    const api = this.gridApi();

    if (!api) return;

    api.refreshHeader();
    api.refreshCells({ force: true });
  }

  /**
   * Overlay handling
   */
  protected syncOverlay(): void {
    const api = this.gridApi();

    if (!api) return;

    api.setGridOption('loading', this.loading);

    if (this.loading) {
      return;
    }

    if (!this.internalRowData().length) {
      api.showNoRowsOverlay();
      return;
    }

    api.hideOverlay();
  }
}
