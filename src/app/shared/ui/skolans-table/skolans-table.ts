import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  HostBinding,
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
import { AG_GRID_LOCALE_EN, AG_GRID_LOCALE_ES } from '@ag-grid-community/locale';

export type SkolansTableSelectionMode = 'none' | 'single' | 'multiple';
export type SkolansTableHeightMode = 'fixed' | 'fill';

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
 * - `heightMode="fill"` is the explicit mode for full-page catalog layouts.
 *   The legacy `height="fill"` API remains supported for existing consumers.
 * - Fixed CSS heights such as `height="420px"` are supported for modals,
 *   cards, tabs, or screens that need explicit sizing.
 * - Fill mode relies on the parent layout to provide resolvable space through
 *   flex or grid sizing; the table never derives its height from the viewport.
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
   * Legacy height API retained for existing consumers.
   *
   * `height="fill"` selects fill mode when `heightMode` is omitted. Any other
   * value is applied as the exact fixed height.
   */
  @Input() height: string = '100%';

  /** Explicit sizing strategy. When omitted, it is derived from the legacy height input. */
  @Input() heightMode?: SkolansTableHeightMode;

  /** Enables AG Grid pagination. */
  @Input() pagination = false;

  /** Forces the pagination panel to remain visible. */
  @Input() alwaysShowPagination = false;

  /** Page size used when pagination is enabled. */
  @Input() pageSize = 10;

  /** Page sizes offered by AG Grid. The active page size is always added. */
  @Input() pageSizeOptions: readonly number[] = [10, 20, 50, 100];

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

  /** Official AG Grid locale matching the application's active language. */
  protected get localeText(): Record<string, string> {
    return this.translate.getCurrentLang().toLowerCase().startsWith('es')
      ? AG_GRID_LOCALE_ES
      : AG_GRID_LOCALE_EN;
  }

  /** Loading overlay supplied by the same official locale as the grid controls. */
  protected get loadingOverlayTemplate(): string {
    return this.localeText['loadingOoo'];
  }

  /** Valid, sorted selector options without mutating the consumer's input. */
  protected get normalizedPageSizeOptions(): number[] {
    return [...new Set([...this.pageSizeOptions, this.effectivePageSize])]
      .filter((value) => Number.isInteger(value) && value > 0)
      .sort((left, right) => left - right);
  }

  /** AG Grid hides the selector when there is no meaningful choice. */
  protected get paginationPageSizeSelector(): number[] | false {
    const options = this.normalizedPageSizeOptions;

    return options.length > 1 ? options : false;
  }

  /** Keeps invalid external values from reaching AG Grid. */
  protected get effectivePageSize(): number {
    return Number.isInteger(this.pageSize) && this.pageSize > 0 ? this.pageSize : 10;
  }

  /** Current sizing mode, with backwards compatibility for height="fill". */
  protected get effectiveHeightMode(): SkolansTableHeightMode {
    return this.heightMode ?? (this.height?.trim() === 'fill' ? 'fill' : 'fixed');
  }

  @HostBinding('class.skolans-table-host--fill')
  protected get usesFillHeight(): boolean {
    return this.effectiveHeightMode === 'fill';
  }

  @HostBinding('class.skolans-table-host--fixed')
  protected get usesFixedHeight(): boolean {
    return this.effectiveHeightMode === 'fixed';
  }

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
   * AG Grid uses `domLayout='normal'`: fixed mode receives the consumer's exact
   * CSS height, while fill mode receives 100% from the resolvable parent chain.
   */
  protected get tableStyle(): { width: string; height: string } {
    return {
      width: '100%',
      height: this.effectiveHeightMode === 'fill' ? '100%' : this.normalizedFixedHeight,
    };
  }

  /** Keeps the previous `height="auto"` behavior as a 100% legacy alias. */
  private get normalizedFixedHeight(): string {
    const requestedHeight = this.height?.trim() || '100%';

    return requestedHeight === 'auto' ? '100%' : requestedHeight;
  }

  private readonly gridApi = signal<GridApi | null>(null);
  private readonly internalRowData = signal<unknown[]>([]);
  protected readonly renderGrid = signal(true);
  private recreationTimerId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.listenToLanguageChanges();

    this.destroyRef.onDestroy(() => {
      if (this.recreationTimerId !== null) {
        clearTimeout(this.recreationTimerId);
      }
    });
  }

  /**
   * React to input changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    const api = this.gridApi();

    if (!api) return;

    if (changes['pageSize'] || changes['pageSizeOptions']) {
      this.recreateGrid();
      return;
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

    if (changes['pagination'] || changes['alwaysShowPagination']) {
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
  }

  /**
   * Selection change
   */
  onSelectionChanged(event: SelectionChangedEvent): void {
    this.selectionChange.emit(event.api.getSelectedRows());
  }

  /** Selects every row in the table, independently of filtering or pagination. */
  selectAll(): void {
    this.gridApi()?.selectAll('all');
  }

  /** Clears the complete row selection. */
  clearSelection(): void {
    this.gridApi()?.deselectAll('all');
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
      .subscribe(() => this.recreateGrid());
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
   * Applies pagination-related options in one place.
   *
   * Keeping these options centralized avoids inconsistent pagination behavior
   * across screens and prevents repeated AG Grid option wiring in parent views.
   */
  private syncPaginationState(api: GridApi): void {
    api.setGridOption('pagination', this.pagination);
    api.setGridOption('paginationPageSize', this.effectivePageSize);
    api.setGridOption('suppressPaginationPanel', !this.pagination && !this.alwaysShowPagination);
  }

  /**
   * Recreates AG Grid when an initial-only option changes.
   *
   * AG Grid reads locale text and page-size selector options only during grid
   * creation. Recreating the grid is therefore required for runtime language or
   * selector-option changes; all regular mutable inputs continue through GridApi.
   */
  private recreateGrid(): void {
    if (!this.gridApi()) {
      return;
    }

    this.gridApi.set(null);
    this.renderGrid.set(false);

    if (this.recreationTimerId !== null) {
      clearTimeout(this.recreationTimerId);
    }

    this.recreationTimerId = setTimeout(() => {
      this.recreationTimerId = null;

      if (!this.destroyRef.destroyed) {
        this.renderGrid.set(true);
      }
    });
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
