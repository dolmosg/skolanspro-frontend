import { Injectable, computed, signal } from '@angular/core';

/**
 * Represents a node in the active controller navigation stack.
 *
 * Each item describes one level in the controller hierarchy, allowing the
 * application to maintain context while navigating through nested controllers.
 *
 * This stack is ephemeral and exists only in memory during the active session.
 */
export interface IControllerStackItem {
  id: number;
  name: string;
  module_id: number;
  parent_id: number | null;
}

/**
 * Controller stack service.
 *
 * This service manages the in-memory navigation stack for hierarchical
 * controller drill-down. It allows the application to preserve context while
 * navigating deeper into controller trees and returning to previous levels.
 *
 * Responsibilities:
 * - Store the active controller navigation path
 * - Allow pushing and popping levels in the hierarchy
 * - Support truncation when navigating to intermediate levels
 * - Expose computed helpers for the current node and stack state
 *
 * Implementation details:
 * - Uses Angular Signals for reactive state management
 * - Keeps state entirely in memory (no persistence)
 *
 * Lifecycle:
 * - Built as the user navigates through controllers
 * - Consumed by controllers, actions, and breadcrumb components
 * - Reset when leaving the controllers/actions flow
 */
@Injectable({
  providedIn: 'root',
})
export class ControllerStackService {
  /**
   * Internal reactive stack container.
   */
  private readonly internalStack = signal<IControllerStackItem[]>([]);

  /**
   * Read-only view of the current controller stack.
   */
  readonly stack = this.internalStack.asReadonly();

  /**
   * Indicates whether the stack currently contains at least one controller node.
   */
  readonly hasItems = computed(() => this.internalStack().length > 0);

  /**
   * Returns the current (deepest) controller in the stack.
   */
  readonly current = computed<IControllerStackItem | null>(() => {
    const stack = this.internalStack();
    return stack.length ? stack[stack.length - 1] : null;
  });

  /**
   * Replaces the entire controller stack.
   *
   * Useful when restoring or normalizing navigation context from a known state.
   *
   * @param items Full stack to apply.
   */
  set(items: IControllerStackItem[]): void {
    this.internalStack.set([...items]);
  }

  /**
   * Pushes a controller node to the top of the stack.
   *
   * @param item Controller node to append.
   */
  push(item: IControllerStackItem): void {
    this.internalStack.update((current) => [...current, item]);
  }

  /**
   * Removes the last controller node from the stack.
   */
  pop(): void {
    this.internalStack.update((current) => current.slice(0, -1));
  }

  /**
   * Clears the entire controller stack.
   *
   * Typically used when the user exits the controllers/actions flow.
   */
  reset(): void {
    this.internalStack.set([]);
  }

  /**
   * Truncates the stack so the specified controller becomes the last item.
   *
   * If the provided id is not found, the stack remains unchanged.
   *
   * @param id Controller identifier to truncate to.
   */
  truncateTo(id: number): void {
    this.internalStack.update((current) => {
      const index = current.findIndex((item) => item.id === id);
      return index >= 0 ? current.slice(0, index + 1) : current;
    });
  }
}
