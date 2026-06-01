import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { ApiResponse } from '../interfaces/api-response.interface';
import { ApiConfigService } from './api-config-service';
import { LanguageService } from './language-service';
import { ToastService } from './toast-service';
import { LoaderService } from './loader-service';

/**
 * Optional HTTP request behavior overrides.
 */
interface ApiRequestOptions {
  /**
   * Controls whether the global loader should be shown for this request.
   * Defaults to true. Set to false for lightweight background actions such as
   * optimistic toggles.
   */
  loader?: boolean;
}

/**
 * API communication service.
 *
 * This service is the single entry point for all HTTP communication between
 * the frontend and backend. It standardizes how requests are built, sent,
 * and how responses and errors are handled.
 *
 * Responsibilities:
 * - Build full request URLs using ApiConfigService
 * - Attach common headers (locale, authorization)
 * - Inject current language into every request
 * - Automatically include Bearer token when available
 * - Manage global loader lifecycle for all requests
 * - Provide typed wrappers for HTTP verbs (GET, POST, PUT, DELETE)
 * - Normalize HTTP transport/server errors into a consistent thrown structure
 * - Trigger global toast notifications for errors
 *
 * Important behavior:
 * - HTTP errors (4xx / 5xx) are intercepted and normalized here
 * - Backend responses that use the official envelope with `success: false`
 *   are logical/business responses, not transport errors. Consumers decide
 *   how to handle them per screen.
 *
 * Architecture role:
 * - ApiConfigService: decides WHERE the request goes
 * - ApiService: decides HOW the request is sent
 * - LoaderService: reflects request lifecycle in the UI
 * - ToastService: communicates errors to the user
 *
 * This service is intentionally thin and predictable, acting as the
 * transport layer of the frontend architecture.
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  /**
   * Angular HTTP client.
   */
  private readonly http = inject(HttpClient);
  /**
   * API URL builder based on current application context.
   */
  private readonly apiConfig = inject(ApiConfigService);
  /**
   * Provides the active application language.
   */
  private readonly languageService = inject(LanguageService);
  /**
   * Global loader state controller.
   */
  private readonly loader = inject(LoaderService);
  /**
   * Global toast/notification service.
   */
  private readonly toast = inject(ToastService);

  /**
   * Builds common HTTP headers for every request.
   *
   * Includes:
   * - `locale`: active language code used by backend responses
   * - `Accept-Language`: active language code used by backend responses
   * - `Accept`: expected JSON response type
   * - `Authorization`: Bearer token when available
   *
   * Locale fallback priority:
   * 1. LanguageService current language
   * 2. `skolans-language` from localStorage
   * 3. Default `es-MX`
   */
  private buildHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    const locale =
      this.languageService.currentLanguage() ||
      localStorage.getItem('skolans-language') ||
      'es-MX';
    let headers = new HttpHeaders({
      locale,
      'Accept-Language': locale,
      Accept: 'application/json',
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  /**
   * Determines whether a request should use the global loader.
   *
   * Loader is enabled by default to preserve existing behavior. Screens can
   * explicitly disable it for lightweight/background requests.
   */
  private shouldUseLoader(options?: ApiRequestOptions): boolean {
    return options?.loader !== false;
  }

  /**
   * Executes an HTTP GET request.
   *
   * @param route Relative backend route
   * @param options Optional request behavior overrides
   * @returns Observable<ApiResponse<T>>
   */
  get<T>(route: string, options?: ApiRequestOptions): Observable<ApiResponse<T>> {
    const useLoader = this.shouldUseLoader(options);

    if (useLoader) {
      this.loader.show();
    }

    return this.http
      .get<ApiResponse<T>>(this.apiConfig.buildUrl(route), {
        headers: this.buildHeaders(),
      })
      .pipe(
        catchError((e) => this.handleError(e)),
        finalize(() => {
          if (useLoader) {
            this.loader.hide();
          }
        }),
      );
  }

  /**
   * Executes an HTTP POST request.
   *
   * @param route Relative backend route
   * @param body Request payload
   * @param options Optional request behavior overrides
   * @returns Observable<ApiResponse<T>>
   */
  post<T>(route: string, body: unknown, options?: ApiRequestOptions): Observable<ApiResponse<T>> {
    const useLoader = this.shouldUseLoader(options);

    if (useLoader) {
      this.loader.show();
    }

    return this.http
      .post<ApiResponse<T>>(this.apiConfig.buildUrl(route), body, {
        headers: this.buildHeaders(),
      })
      .pipe(
        catchError((e) => this.handleError(e)),
        finalize(() => {
          if (useLoader) {
            this.loader.hide();
          }
        }),
      );
  }

  /**
   * Executes an HTTP PUT request.
   *
   * @param route Relative backend route
   * @param body Request payload
   * @param options Optional request behavior overrides
   * @returns Observable<ApiResponse<T>>
   */
  put<T>(route: string, body: unknown, options?: ApiRequestOptions): Observable<ApiResponse<T>> {
    const useLoader = this.shouldUseLoader(options);

    if (useLoader) {
      this.loader.show();
    }

    return this.http
      .put<ApiResponse<T>>(this.apiConfig.buildUrl(route), body, {
        headers: this.buildHeaders(),
      })
      .pipe(
        catchError((e) => this.handleError(e)),
        finalize(() => {
          if (useLoader) {
            this.loader.hide();
          }
        }),
      );
  }

  /**
   * Executes an HTTP DELETE request.
   *
   * @param route Relative backend route
   * @param options Optional request behavior overrides
   * @returns Observable<ApiResponse<T>>
   */
  delete<T>(route: string, options?: ApiRequestOptions): Observable<ApiResponse<T>> {
    const useLoader = this.shouldUseLoader(options);

    if (useLoader) {
      this.loader.show();
    }

    return this.http
      .delete<ApiResponse<T>>(this.apiConfig.buildUrl(route), {
        headers: this.buildHeaders(),
      })
      .pipe(
        catchError((e) => this.handleError(e)),
        finalize(() => {
          if (useLoader) {
            this.loader.hide();
          }
        }),
      );
  }

  /**
   * Safely extracts a JSON-like error body from Angular HttpErrorResponse.
   */
  private parseErrorBody(error: HttpErrorResponse): unknown {
    const body = error?.error;

    if (!body) {
      return null;
    }

    if (typeof body === 'string') {
      try {
        return JSON.parse(body);
      } catch {
        return { message: body };
      }
    }

    return body;
  }

  /**
   * Extracts the best available user-facing message from a normalized or raw backend error body.
   */
  private getErrorMessage(body: unknown): string {
    if (body && typeof body === 'object') {
      const objectBody = body as { message?: unknown; error?: unknown };

      if (typeof objectBody.message === 'string' && objectBody.message.trim().length > 0) {
        return objectBody.message;
      }

      if (typeof objectBody.error === 'string' && objectBody.error.trim().length > 0) {
        return objectBody.error;
      }
    }

    return 'errors.unexpected';
  }

  /**
   * Extracts validation or field errors from a normalized or raw backend error body.
   *
   * Preferred contract format: body.data.errors.
   * Laravel HTTP 422 fallback format: body.errors.
   */
  private getErrorDetails(body: unknown): Record<string, unknown> {
    if (!body || typeof body !== 'object') {
      return {};
    }

    const objectBody = body as {
      data?: { errors?: Record<string, unknown> };
      errors?: Record<string, unknown>;
    };

    return objectBody.data?.errors || objectBody.errors || {};
  }

  /**
   * Handles HTTP transport and server-side errors globally.
   *
   * Behavior:
   * - Extracts backend error payload when available
   * - Resolves a user-facing message
   * - Triggers a global error toast except for HTTP 422 validation errors
   * - Normalizes the error into a predictable structure
   *
   * Normalized error shape:
   * - status: HTTP status code
   * - success: always false
   * - message: user-facing message
   * - errors: validation or field errors
   * - data: backend data payload (if present)
   * - raw: original backend response
   *
   * HTTP 422 is intentionally not shown as a global toast because it belongs
   * to form-level validation handling.
   *
   * @param error HttpErrorResponse
   * @returns Observable that throws a normalized error object
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    if (error?.status === 0) {
      const normalized = {
        status: 0,
        success: false,
        message: 'errors.network',
        errors: {},
        data: null,
        raw: error?.error ?? null,
      };

      this.toast.error(normalized.message);

      return throwError(() => normalized);
    }

    const body = this.parseErrorBody(error);
    const message = this.getErrorMessage(body);
    const errors = this.getErrorDetails(body);
    const data = body && typeof body === 'object' && 'data' in body
      ? (body as { data?: unknown }).data ?? null
      : null;

    if (error?.status !== 422) {
      this.toast.error(message);
    }

    const normalized = {
      status: error?.status ?? 500,
      success: false,
      message,
      errors,
      data,
      raw: body,
    };

    return throwError(() => normalized);
  }
}