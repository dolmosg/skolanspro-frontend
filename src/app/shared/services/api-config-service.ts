import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AppContextService } from './app-context-service';

/**
 * API endpoint configuration service.
 *
 * This service is responsible for constructing all API URLs dynamically
 * based on the current application runtime context (central or tenant).
 *
 * It abstracts away domain resolution and path construction so that the
 * rest of the application never needs to know:
 * - which domain is being used
 * - whether the app is in central or tenant mode
 * - how API prefixes are structured
 *
 * Responsibilities:
 * - Resolve hostname depending on context
 * - Construct base URL (protocol + hostname)
 * - Determine API prefix (`/api/central` or `/api/tenant`)
 * - Provide full API base URL
 * - Build endpoint URLs in a safe and consistent way
 *
 * Context behavior:
 * - Central → root domain (e.g., skolans.com)
 * - Tenant → subdomain (e.g., demo.skolans.com)
 *
 * Examples:
 * - Central → https://skolans.com/api/central/...
 * - Tenant → https://demo.skolans.com/api/tenant/...
 *
 * Architecture role:
 * - AppContextService: decides WHAT context we are in
 * - ApiConfigService: decides WHERE requests go
 * - ApiService: decides HOW requests are executed
 */
@Injectable({
  providedIn: 'root',
})
export class ApiConfigService {
  /**
   * Application runtime context resolver.
   */
  private readonly appContext = inject(AppContextService);

  /**
   * Environment API configuration (protocol, domain, prefixes).
   */
  private readonly api = environment.api;

  /**
   * Resolves the hostname based on the current application context.
   *
   * Central:
   * - Returns the root domain
   *
   * Tenant:
   * - Requires a tenantKey
   * - Builds subdomain dynamically
   *
   * @throws Error when tenant context is active without a tenantKey
   *
   * Examples:
   * - skolans.com
   * - demo.skolans.com
   */
  get hostname(): string {
    const { rootDomain } = this.api;
    const context = this.appContext.current;

    if (context.isCentral) {
      return rootDomain;
    }

    if (!context.tenantKey) {
      throw new Error('Tenant context detected without tenantKey.');
    }

    return `${context.tenantKey}.${rootDomain}`;
  }

  /**
   * Resolves the frontend router prefix depending on the current context.
   *
   * Central:
   * - /central
   *
   * Tenant:
   * - /tenant
   *
   * This prefix is used by Angular Router navigation, not by HTTP requests.
   */
  get routerPrefix(): string {
    return this.appContext.isCentral ? 'central' : 'tenant';
  }

  /**
   * Builds the base URL including protocol and hostname.
   *
   * Examples:
   * - https://skolans.com
   * - https://demo.skolans.com
   */
  get baseUrl(): string {
    return `${this.api.protocol}://${this.hostname}`;
  }

  /**
   * Resolves the API prefix depending on the current context.
   *
   * Central:
   * - /api/central
   *
   * Tenant:
   * - /api/tenant
   */
  get apiPrefix(): string {
    return this.appContext.isCentral
      ? `${this.api.apiRoute}${this.api.centralPrefix}`
      : `${this.api.apiRoute}${this.api.tenantPrefix}`;
  }

  /**
   * Full API base URL combining domain and prefix.
   *
   * Examples:
   * - https://skolans.com/api/central
   * - https://demo.skolans.com/api/tenant
   */
  get apiUrl(): string {
    return `${this.baseUrl}${this.apiPrefix}`;
  }

  /**
   * Builds a complete endpoint URL.
   *
   * Normalizes the route by removing leading slashes to prevent malformed URLs.
   *
   * @param route Relative backend route
   * @returns Fully qualified API URL
   *
   * Examples:
   * buildUrl('users') → https://.../users
   * buildUrl('/users') → https://.../users
   */
  buildUrl(route: string): string {
    const cleanRoute = route.replace(/^\/+/, '');
    return `${this.apiUrl}/${cleanRoute}`;
  }
}
