import { Injectable, Type, signal } from '@angular/core';

/**
 * Options used to open a modal instance.
 *
 * @template TData Type of data passed into the modal component.
 */
export interface ISklModalOpenOptions<TData = unknown> {
  component: Type<unknown>;
  data?: TData;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

/**
 * Internal modal state representation.
 *
 * @template TData Type of data stored in the modal.
 */
export interface ISklModalState<TData = unknown> {
  open: boolean;
  component: Type<unknown> | null;
  data: TData | null;
  title: string;
  description: string;
  size: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop: boolean;
  closeOnEscape: boolean;
  showCloseButton: boolean;
}

/**
 * Default modal state used to reset the modal after closing.
 */
const DEFAULT_STATE: ISklModalState = {
  open: false,
  component: null,
  data: null,
  title: '',
  description: '',
  size: 'md',
  closeOnBackdrop: true,
  closeOnEscape: true,
  showCloseButton: true,
};

/**
 * Global modal service.
 *
 * This service provides a centralized way to open, control, and close modal
 * components using Angular signals. It ensures a single modal instance is
 * active at a time and exposes a promise-based API for handling modal results.
 *
 * Key features:
 * - Dynamic component injection
 * - Promise-based result handling
 * - Centralized state management
 * - Configurable behavior (backdrop, escape, size, etc.)
 */
@Injectable({
  providedIn: 'root',
})
export class SklModalService {
  /**
   * Internal reactive state of the modal.
   */
  private readonly modalState = signal<ISklModalState>({ ...DEFAULT_STATE });

  /**
   * Resolver function for the current modal promise.
   */
  private pendingResolve: ((value: unknown | null) => void) | null = null;

  /**
   * Read-only signal exposed to consumers for rendering purposes.
   */
  readonly state = this.modalState.asReadonly();
  /**
   * Indicates whether a modal is currently open.
   */
  readonly isOpen = () => this.modalState().open;

  /**
   * Opens a modal with the given configuration.
   *
   * If another modal is already open, it will be closed before opening the new one.
   *
   * @template TData Type of data passed into the modal.
   * @template TResult Type of result expected from the modal.
   * @param options Modal configuration options.
   * @returns Promise that resolves when the modal is closed.
   */
  open<TData = unknown, TResult = unknown>(
    options: ISklModalOpenOptions<TData>,
  ): Promise<TResult | null> {
    // cerrar cualquier modal previo
    this.close(null);

    this.modalState.set({
      open: true,
      component: options.component,
      data: (options.data ?? null) as TData | null,
      title: options.title ?? '',
      description: options.description ?? '',
      size: options.size ?? 'md',
      closeOnBackdrop: options.closeOnBackdrop ?? true,
      closeOnEscape: options.closeOnEscape ?? true,
      showCloseButton: options.showCloseButton ?? true,
    });

    return new Promise<TResult | null>((resolve) => {
      this.pendingResolve = resolve as (value: unknown | null) => void;
    });
  }

  /**
   * Closes the current modal and resolves the pending promise.
   *
   * @template TResult Type of result returned by the modal.
   * @param result Optional result returned to the caller.
   */
  close<TResult = unknown>(result: TResult | null = null): void {
    const resolver = this.pendingResolve;
    this.pendingResolve = null;

    this.modalState.set({ ...DEFAULT_STATE });

    resolver?.(result);
  }

  /**
   * Partially updates the modal state without closing it.
   *
   * Useful for updating title, description, or other UI properties dynamically.
   *
   * @param partial Partial state to merge into the current modal state.
   */
  patch(partial: Partial<Omit<ISklModalState, 'open' | 'component'>>): void {
    this.modalState.update((current) => ({
      ...current,
      ...partial,
    }));
  }
}