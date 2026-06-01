/**
 * Application runtime context resolver.
 *
 * This service determines in which technical context the frontend is running
 * (central or tenant) before any API calls or bootstrap flows occur.
 *
 * It answers a foundational question for the entire application:
 * - Are we running in `central` context?
 * - Or in `tenant` context?
 *
 * Based on this, other layers can decide:
 * - API base paths (`/central` vs `/tenant`)
 * - Domain-based routing behavior
 * - Whether a tenant identifier must be resolved
 *
 * Important:
 * - This is a low-level infrastructure service.
 * - It runs before `checkstate`.
 * - It does NOT contain branding, theme, or configuration data.
 *
 * Those belong to `SiteStateService`.
 *
 * Resolution strategy:
 * 1. Environment override (for development/testing)
 * 2. Hostname analysis (production behavior)
 */
import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AppContext, AppContextType } from '../app-context-types';

/**
 * Provides reactive and synchronous access to the resolved application context.
 *
 * Typical consumers:
 * - ApiConfigService
 * - Routing infrastructure
 * - Early bootstrap logic
 */
@Injectable({
  providedIn: 'root',
})
export class AppContextService {
  /**
   * Internal reactive container holding the resolved runtime context.
   */
  readonly context = signal<AppContext>(this.resolveContext());

  /**
   * Synchronous access helpers for commonly consumed context properties.
   */
  /**
   * Returns the full resolved application context object.
   */
  get current(): AppContext {
    return this.context();
  }

  /**
   * Context type discriminator: `central` or `tenant`.
   */
  get type(): AppContextType {
    return this.context().type;
  }

  /**
   * Indicates whether the current context is central.
   */
  get isCentral(): boolean {
    return this.context().isCentral;
  }

  /**
   * Indicates whether the current context is tenant.
   */
  get isTenant(): boolean {
    return this.context().isTenant;
  }

  /**
   * Tenant identifier resolved from the subdomain when in tenant context.
   * Returns null in central context.
   */
  get tenantKey(): string | null {
    return this.context().tenantKey;
  }

  /**
   * Resolves the application context during service initialization.
   *
   * Priority:
   * 1. Environment override (useful for local development)
   * 2. Hostname analysis
   */
  private resolveContext(): AppContext {
    const hostname = window.location.hostname;

    if (environment.appContextOverride?.enabled) {
      const type = environment.appContextOverride.type;
      const tenantKey =
        type === 'tenant' ? environment.appContextOverride.tenantKey : null;

      return {
        type,
        hostname,
        subdomain: tenantKey,
        tenantKey,
        isCentral: type === 'central',
        isTenant: type === 'tenant',
      };
    }

    return this.resolveFromHostname(hostname);
  }

  /**
   * Resolves application context from the current hostname.
   *
   * Rules:
   * - Root domain => `central`
   * - Subdomain present => `tenant`
   *
   * Examples:
   * - `skolans.com` => central
   * - `demo.skolans.com` => tenant (tenantKey = `demo`)
   */
  private resolveFromHostname(hostname: string): AppContext {
    const cleanHost = hostname.toLowerCase();
    const parts = cleanHost.split('.');

    const subdomain = parts.length > 2 ? parts[0] : null;
    const isRootDomain = parts.length <= 2;
    const isCentral = isRootDomain;
    const tenantKey = !isCentral && subdomain ? subdomain : null;
    const type: AppContextType = isCentral ? 'central' : 'tenant';

    return {
      type,
      hostname,
      subdomain,
      tenantKey,
      isCentral,
      isTenant: !isCentral,
    };
  }
}