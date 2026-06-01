import { computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../services/api-service';
import { RouteMetaService } from '../services/route-meta-service';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { SklModalService } from '../services/skl-modal-service';
import { ToastService } from '../services/toast-service';
import { ScreenOptionItem, ScreenChildItem } from '../interfaces/configuration.interfaces';
import { SklConfirmModal } from './skl-confirm-modal/skl-confirm-modal';
import {
  ApiFailResponse,
  ApiResponse,
  ApiSuccessResponse,
} from '../interfaces/api-response.interface';
import { TranslateService } from '@ngx-translate/core';
import { ApiConfigService } from '@shared/services/api-config-service';
import { SiteStateService } from '../services/site-state';
import { NameCasingMode } from '../interfaces/central.interfaces';

/**
 * Base class for Skolans UI components.
 *
 * This class centralizes common services and helpers used by feature components,
 * catalog screens, and higher-level abstractions such as BaseCrud.
 *
 * Responsibilities:
 * - Provide access to common services (`api`, `toast`, `modal`, `translate`).
 * - Resolve the current API route from route metadata.
 * - Expose a shared loading signal for request lifecycles.
 * - Store and query dynamic screen options provided by the backend.
 * - Provide shared API envelope handling helpers.
 *
 * Error strategy:
 * - HTTP and transport errors are normalized and notified globally by ApiService.
 * - Logical API failures (`success: false`) are handled here through
 *   `handleApiFailure()`.
 * - Components should generally avoid direct `console.error` calls and use this
 *   shared handling flow instead.
 */
export abstract class SkolansBaseComponent {
  /** Shared services available to all components extending this base class. */
  protected readonly translate = inject(TranslateService);
  protected readonly activatedRoute = inject(ActivatedRoute);
  protected readonly routeMeta = inject(RouteMetaService);
  protected readonly api = inject(ApiService);
  protected readonly toast = inject(ToastService);
  protected readonly siteState = inject(SiteStateService);

  protected readonly nameCasing = computed<NameCasingMode>(() => {
    return this.siteState.nameCasing();
  });

  /** Route and request state shared by screens using backend-driven metadata. */
  protected readonly apiRoute = signal<string | null>(null);
  protected readonly loading = signal(false);

  protected readonly hasApiRoute = computed(() => !!this.apiRoute());

  /** Modal service and backend-provided screen options. */
  protected readonly modal = inject(SklModalService);
  public readonly options = signal<ScreenOptionItem[]>([]);
  public readonly children = signal<ScreenChildItem[]>([]);

  public readonly apiConfig = inject(ApiConfigService);

  protected readonly routerContext = computed(() => this.apiConfig.routerPrefix);

  /**
   * Replaces the current screen options collection.
   *
   * Screen options usually come from the backend and define which actions are
   * available for the current controller, such as create, update, delete,
   * ordering, permissions, or other contextual operations.
   */
  protected setScreenOptions(options: ScreenOptionItem[] | null | undefined): void {
    this.options.set(Array.isArray(options) ? options : []);
  }

  /**
   * Clears the current screen options collection.
   */
  protected clearScreenOptions(): void {
    this.options.set([]);
  }

  /**
   * Returns the current options list.
   */
  protected getScreenOptions(): ScreenOptionItem[] {
    return this.options() ?? [];
  }

  /**
   * Returns a single option by its name.
   */
  protected getScreenOption(name: string): ScreenOptionItem | null {
    return this.getScreenOptions().find((o) => o?.name === name) ?? null;
  }

  /**
   * Indicates whether an option exists.
   */
  protected hasScreenOption(name: string): boolean {
    return !!this.getScreenOption(name);
  }

  /**
   * Maps dynamic option colors to the variants supported by `app-ui-button`.
   *
   * Backend options can define semantic colors. This helper constrains those
   * values to the variants that the shared button component supports.
   */
  protected getScreenOptionVariant(
    name: string,
    fallback: 'primary' | 'secondary' | 'ghost' | 'danger' = 'secondary',
  ): 'primary' | 'secondary' | 'ghost' | 'danger' {
    const option = this.getScreenOption(name);
    const color = option?.color?.trim();

    switch (color) {
      case 'primary':
      case 'secondary':
      case 'ghost':
      case 'danger':
        return color;
      default:
        return fallback;
    }
  }

  /**
   * Initializes the API route for the current screen using route metadata.
   *
   * Components should call this during initialization when their API endpoint is
   * derived from the active route configuration.
   */
  protected initRouteMeta(): void {
    this.apiRoute.set(this.routeMeta.getApiRoute(this.activatedRoute));
  }

  /**
   * Wraps an observable request and toggles the shared loading signal.
   *
   * This helper only manages UI loading state. It does not catch errors; HTTP
   * errors remain the responsibility of ApiService and the component subscriber.
   */
  protected request<T>(obs: Observable<T>): Observable<T> {
    this.loading.set(true);

    return obs.pipe(finalize(() => this.loading.set(false)));
  }

  /**
   * Handles API logical failures that still use the official response envelope.
   *
   * HTTP/transport errors are handled globally by ApiService. This helper is for
   * valid backend responses where `success` is false according to the Skolans
   * API envelope contract.
   *
   * @returns   true when the response is a failure and the caller should stop.
   */
  protected handleApiFailure<T, E>(response: ApiResponse<T, E>): response is ApiFailResponse<E> {
    if (response.success) {
      return false;
    }

    const errors = (response.data as any)?.errors;

    if (errors) {
      const firstError = this.firstValidationError(errors);

      if (firstError) {
        this.toast.error(this.translate.instant(firstError));
        return true;
      }
    }

    const msg = response.message || 'errors.unexpected';
    this.toast.error(this.translate.instant(msg));
    return true;
  }

  private firstValidationError(errors: Record<string, string[] | string>): string | null {
    const firstKey = Object.keys(errors)[0];

    if (!firstKey) {
      return null;
    }

    const value = errors[firstKey];

    if (Array.isArray(value)) {
      return value[0] ?? null;
    }

    if (typeof value === 'string') {
      return value;
    }

    return null;
  }

  /**
   * Shows the standard success toast for successful API envelope responses.
   *
   * Components can call this after mutations such as create, update, delete,
   * reorder, sync, or any custom backend action that returns a success message.
   */
  protected handleApiSuccess<T, E>(response: ApiResponse<T, E>): void {
    this.toast.success(this.translate.instant(response.message));
  }

  /**
   * Opens the standardized delete confirmation modal.
   *
   * Concrete CRUD screens provide only the title and message translation keys.
   * The visual structure, action labels, size, and behavior remain consistent
   * across catalog screens.
   *
   * @param titleKey Translation key used as the modal title.
   * @param messageKey Translation key used as the confirmation message.
   * @returns True only when the user confirms the destructive action.
   */
  protected ignoreHandledRequestError(): void {
    /**
     * HTTP errors are already normalized and notified by ApiService.
     * Components can use this when no local cleanup is needed.
     */
  }

  protected async confirmDelete(titleKey: string, messageKey: string): Promise<boolean> {
    const confirmed = await this.modal.open<
      {
        message: string;
        confirmLabel: string;
        cancelLabel: string;
        type: 'danger';
      },
      boolean
    >({
      component: SklConfirmModal,
      title: this.translate.instant(titleKey),
      data: {
        message: this.translate.instant(messageKey),
        confirmLabel: this.translate.instant('common.delete'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'danger',
      },
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    return confirmed === true;
  }

  /**
   * Executes a standard API request following the Skolans envelope pattern.
   *
   * - Manages loading via `request()`
   * - Handles `success:false` via `handleApiFailure`
   * - Shows success toast via `handleApiSuccess`
   * - Delegates HTTP errors to ApiService and uses a no-op handler
   */
  protected executeRequest<T, E = unknown>(
    obs: Observable<ApiResponse<T, E>>,
    onSuccess: (res: ApiSuccessResponse<T>) => void,
  ): void {
    this.request(obs).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) return;

        this.handleApiSuccess(res);
        onSuccess(res as ApiSuccessResponse<T>);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  /**
   * Executes a request without showing a success toast.
   *
   * Useful for load/reload operations where only data updates are required.
   *
   * An optional `onError` callback can be provided when the component needs
   * local cleanup after an HTTP/transport error, such as clearing data or
   * resetting local loading flags. The HTTP error itself is still normalized
   * and notified globally by `ApiService`.
   */
  protected executeSilentRequest<T, E = unknown>(
    obs: Observable<ApiResponse<T, E>>,
    onSuccess: (res: ApiSuccessResponse<T>) => void,
    onError?: () => void,
  ): void {
    this.request(obs).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) return;

        onSuccess(res as ApiSuccessResponse<T>);
      },
      error: () => {
        onError?.();
        this.ignoreHandledRequestError();
      },
    });
  }

  /**
   * Executes a mutation request (create/update/delete) with success handling.
   *
   * Alias of `executeRequest` for semantic clarity in mutation flows.
   */
  protected executeMutationRequest<T, E = unknown>(
    obs: Observable<ApiResponse<T, E>>,
    onSuccess: (res: ApiSuccessResponse<T>) => void,
  ): void {
    this.executeRequest(obs, onSuccess);
  }

  /**
   * Replaces the current child controllers collection.
   *
   * Children usually come from the backend and define which child controllers
   * are available for the current controller and authenticated role.
   */
  protected setScreenChildren(children: ScreenChildItem[] | null | undefined): void {
    this.children.set(Array.isArray(children) ? children : []);
  }

  /**
   * Clears the current child controllers collection.
   */
  protected clearScreenChildren(): void {
    this.children.set([]);
  }

  /**
   * Returns the current child controllers list.
   */
  protected getScreenChildren(): ScreenChildItem[] {
    return this.children() ?? [];
  }

  /**
   * Returns a single child controller by route or name.
   */
  protected getScreenChild(identifier: string): ScreenChildItem | null {
    return (
      this.getScreenChildren().find(
        (child) => child?.route === identifier || child?.name === identifier,
      ) ?? null
    );
  }

  /**
   * Indicates whether a child controller exists.
   */
  protected hasScreenChild(identifier: string): boolean {
    return !!this.getScreenChild(identifier);
  }
}
