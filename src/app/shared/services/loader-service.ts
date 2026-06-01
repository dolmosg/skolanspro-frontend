import { Injectable, signal, computed } from '@angular/core';

/**
 * Global loader service.
 *
 * This service centralizes the application loading state using a counter-based
 * approach. It is designed to correctly handle multiple concurrent async
 * operations (e.g., parallel HTTP requests) without prematurely hiding the
 * loader.
 *
 * How it works:
 * - Each `show()` call increments an internal counter
 * - Each `hide()` call decrements the counter
 * - The loader is visible while the counter is greater than zero
 *
 * Benefits:
 * - Prevents flickering loaders with concurrent requests
 * - Guarantees consistency across the application
 * - Works seamlessly with interceptors and base components
 *
 * Typical usage:
 * - API interceptor (automatic show/hide)
 * - Manual control in long-running operations
 */
@Injectable({
  providedIn: 'root',
})
export class LoaderService {
  /**
   * Internal counter of active async operations.
   */
  private readonly activeRequests = signal(0);

  /**
   * Reactive loading state.
   *
   * Returns true when at least one async operation is active.
   */
  readonly isLoading = computed(() => this.activeRequests() > 0);

  /**
   * Increments the active request counter.
   *
   * Should be called when a new async operation starts.
   */
  show(): void {
    this.activeRequests.update((count) => count + 1);
  }

  /**
   * Decrements the active request counter.
   *
   * Ensures the counter never goes below zero to avoid inconsistent states.
   * Should be called when an async operation finishes.
   */
  hide(): void {
    this.activeRequests.update((count) => Math.max(0, count - 1));
  }

  /**
   * Resets the loader state.
   *
   * Forces the counter to zero, hiding the loader immediately.
   * Typically used on logout, navigation resets, or critical failures.
   */
  reset(): void {
    this.activeRequests.set(0);
  }
}
