import { Injectable, inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

/**
 * Toast service wrapper.
 *
 * This service centralizes all toast/notification interactions in the app
 * using `ngx-toastr`. It provides a simplified and consistent API so
 * components do not depend directly on the third-party library.
 *
 * Benefits:
 * - Decouples UI components from `ngx-toastr`
 * - Standardizes notification usage across the app
 * - Allows future customization (themes, translations, logging, etc.)
 */
@Injectable({
  providedIn: 'root',
})
export class ToastService {
  /**
   * Underlying toastr instance used to display notifications.
   */
  private readonly toastr = inject(ToastrService);

  /**
   * Displays a success notification.
   *
   * @param message Main message content.
   * @param title Optional title shown above the message.
   */
  success(message: string, title?: string): void {
    this.toastr.success(message, title);
  }

  /**
   * Displays an error notification.
   *
   * @param message Main message content.
   * @param title Optional title shown above the message.
   */
  error(message: string, title?: string): void {
    this.toastr.error(message, title);
  }

  /**
   * Displays a warning notification.
   *
   * @param message Main message content.
   * @param title Optional title shown above the message.
   */
  warning(message: string, title?: string): void {
    this.toastr.warning(message, title);
  }

  /**
   * Displays an informational notification.
   *
   * @param message Main message content.
   * @param title Optional title shown above the message.
   */
  info(message: string, title?: string): void {
    this.toastr.info(message, title);
  }

  /**
   * Clears all active toast notifications.
   */
  clear(): void {
    this.toastr.clear();
  }
}
