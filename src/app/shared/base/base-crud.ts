import { WritableSignal } from '@angular/core';
import { SkolansBaseComponent } from './skolans-base-component';

/**
 * BaseCrud
 * --------
 * Shared helper base for catalog-style CRUD screens.
 *
 * This class contains reusable behaviors that are commonly repeated by simple
 * catalog components. It extends `SkolansBaseComponent`, so it already has
 * access to shared services and API envelope helpers such as `handleApiFailure`
 * and `handleApiSuccess`.
 *
 * Responsibilities:
 * - Open standardized delete confirmation modals.
 * - Apply local create/update/delete changes to writable item signals.
 * - Clear row selection signals consistently.
 * - Sort and normalize ordered catalog rows.
 * - Extract valid items from flexible mutation endpoint payloads.
 *
 * Non-responsibilities:
 * - It does not own API routes or execute requests by itself.
 * - It does not own table state, filters, pagination, or selection signals.
 * - It does not decide endpoint payload shapes beyond the helper extraction method.
 * - It does not replace custom components that need specialized behavior.
 *
 * Use this class when a screen behaves like a standard catalog CRUD. Components
 * with more complex flows can extend `SkolansBaseComponent` directly and still
 * reuse the common API envelope helpers.
 */
export abstract class BaseCrud<TItem> extends SkolansBaseComponent {
  

  /**
   * Appends a newly created item to a writable catalog signal.
   *
   * This helper only updates local UI state. The API mutation must already have
   * succeeded before calling it.
   */
  protected applyCreatedItem<T extends { id: number }>(items: WritableSignal<T[]>, item: T): void {
    items.update((current) => [...current, item]);
  }

  /**
   * Replaces an existing catalog item by id inside a writable signal.
   *
   * If no matching item exists, the current collection is returned unchanged.
   */
  protected applyUpdatedItem<T extends { id: number }>(items: WritableSignal<T[]>, item: T): void {
    items.update((current) =>
      current.map((currentItem) => (currentItem.id === item.id ? item : currentItem)),
    );
  }

  /**
   * Removes a catalog item by id from a writable signal.
   */
  protected applyDeletedItem<T extends { id: number }>(items: WritableSignal<T[]>, id: number): void {
    items.update((current) => current.filter((item) => item.id !== id));
  }

  /**
   * Clears a selection signal after mutations or navigation changes.
   */
  protected clearSelection<T>(selection: WritableSignal<T[]>): void {
    selection.set([]);
  }

  /**
   * Returns a new array sorted by the standard `order` property.
   *
   * The original array is never mutated.
   */
  protected sortByOrder<T extends { order: number }>(items: T[]): T[] {
    return [...items].sort((a, b) => a.order - b.order);
  }

  /**
   * Normalizes local order indexes using the current visual order.
   *
   * Useful after drag-and-drop operations, where the visible row order should
   * become the persisted `order` value.
   */
  protected normalizeOrder<T extends { order: number }>(items: T[]): T[] {
    return items.map((item, index) => ({
      ...item,
      order: index,
    }));
  }

  /**
   * Extracts a valid item from flexible mutation payloads.
   *
   * Some endpoints return the changed record directly, while others wrap it in
   * an `item` property or in a domain-specific wrapper key. This helper keeps
   * concrete CRUD screens from duplicating that parsing logic.
   *
   * Accepted shapes:
   * - direct item
   * - `{ item: T }`
   * - `{ [wrapperKey]: T }`
   *
   * @param data Mutation response payload.
   * @param isValid Type guard used to verify the extracted value.
   * @param wrapperKey Optional domain-specific wrapper key.
   * @returns The extracted item when valid; otherwise null.
   */
  protected extractMutationItem<TWrapped extends object>(
    data: TWrapped | null | undefined,
    isValid: (value: unknown) => value is TItem,
    wrapperKey?: keyof TWrapped,
  ): TItem | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const record = data as Record<string, unknown>;
    const wrapped = wrapperKey ? record[String(wrapperKey)] : undefined;
    const candidate = wrapped ?? record['item'] ?? data;

    return isValid(candidate) ? candidate : null;
  }
}
