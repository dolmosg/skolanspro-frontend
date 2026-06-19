import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthPerson, AuthRole, AuthSession, AuthUser } from '../interfaces/auth-session';
import { ApiService } from './api-service';
import { Observable, of } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';

/**
 * Authentication session state service.
 *
 * This service acts as the single source of truth for the authenticated user
 * session. It stores the active auth session in memory, persists it in
 * localStorage, and restores it during application startup.
 *
 * Responsibilities:
 * - Store and expose authentication session data
 * - Persist session values in localStorage
 * - Hydrate session state from localStorage on app startup
 * - Expose derived helpers such as active role, available roles, initials,
 *   picture, and identity fields
 * - Provide a single source of truth for auth-related UI, guards, and layout
 *
 * Notes:
 * - This service manages authenticated user session state only.
 * - Site-wide bootstrap state such as branding, theme, and languages belongs
 *   to `SiteStateService`.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthStateSevice {
  private readonly api = inject(ApiService);
  /**
   * Internal reactive session container.
   */
  private readonly state = signal<AuthSession>({
    token: null,
    tokenType: null,
    context: null,
    tenant: null,
    user: null,
  });

  /**
   * Flat list of backend-approved route/resource keys used by access guards.
   */
  private readonly allowedRoutesState = signal<string[]>([]);

  /**
   * In-flight `/me` validation request shared by concurrent guards.
   *
   * This does not cache successful validations. It only prevents duplicate
   * simultaneous `/me` calls while a validation request is already pending.
   */
  private sessionValidationRequest: Observable<boolean> | null = null;

  /**
   * Raw session accessors.
   */
  readonly session = computed(() => this.state());
  readonly allowedRoutes = computed(() => this.allowedRoutesState());
  /**
   * Indicates whether a token and user are both currently available.
   */
  readonly hasSession = computed(() => !!this.state().token && !!this.state().user);

  /**
   * Derived authentication properties.
   *
   * These computed signals expose safe slices of the current session for UI,
   * guards, and layout components.
   */
  readonly token = computed(() => this.state().token);
  readonly tokenType = computed(() => this.state().tokenType);
  readonly context = computed(() => this.state().context);
  readonly tenant = computed(() => this.state().tenant ?? null);
  readonly user = computed<AuthUser | null>(() => this.state().user);
  readonly isAuthenticated = computed(() => !!this.state().token && !!this.state().user);
  readonly activeRole = computed<AuthRole | null>(() => this.state().user?.role ?? null);
  readonly availableRoles = computed<AuthRole[]>(() => this.state().user?.roles ?? []);
  readonly userInitials = computed(() => {
    const user = this.state().user;

    if (!user) {
      return null;
    }

    const initials = user.person?.initials || user.initials;

    if (initials?.trim()) {
      return initials.trim().toUpperCase();
    }

    return this.buildInitials(this.userDisplayName());
  });
  readonly userPicture = computed(() => {
    const user = this.state().user;

    if (!user) {
      return null;
    }

    if (this.context() === 'tenant') {
      return user.person?.photo || user.person?.picture || null;
    }

    return user.photo || user.person?.picture || null;
  });
  readonly userDisplayName = computed(() => {
    const user = this.state().user;

    if (!user) {
      return null;
    }

    return user.person?.full_name || user.name || user.email || null;
  });

  readonly userName = this.userDisplayName;
  readonly userEmail = computed(() => this.state().user?.email ?? null);

  /**
   * Indicates whether a token is currently available, even if user state has
   * not yet been revalidated against the backend.
   */
  readonly hasToken = computed(() => !!this.state().token);

  /**
   * Replaces the current list of backend-approved route/resource keys.
   */
  setAllowedRoutes(routes: string[] | null | undefined): void {
    const normalizedRoutes = (routes ?? [])
      .map((route) => route?.trim())
      .filter((route): route is string => !!route);

    this.allowedRoutesState.set(normalizedRoutes);
    this.persistAllowedRoutes(normalizedRoutes);
  }

  /**
   * Clears the current list of backend-approved route/resource keys.
   *
   * This must be used whenever the authorization context changes, such as
   * switching between central and tenant, changing tenant, changing user, or
   * changing active role.
   */
  clearAllowedRoutes(): void {
    this.allowedRoutesState.set([]);
    this.persistAllowedRoutes([]);
  }

  /**
   * Returns true when the provided resource key is explicitly allowed.
   */
  hasAccess(route: string | null | undefined): boolean {
    if (!route?.trim()) {
      return false;
    }

    return this.allowedRoutesState().includes(route.trim());
  }

  /**
   * This method intentionally validates the token only.
   *
   * It must not refresh user, role, navigation, or allowedRoutes data because
   * `/me` may return a lightweight payload. Updating session data here could
   * drop nested fields such as `person.photo` after login/navigation.
   *
   * If validation fails, the session is cleared safely.
   */
  validateSession(): Observable<boolean> {
    if (!this.token()) {
      this.clear();
      return of(false);
    }

    if (this.sessionValidationRequest) {
      return this.sessionValidationRequest;
    }

    this.sessionValidationRequest = this.api
      .get<{
        user: AuthUser | null;
        context: 'central' | 'tenant' | null;
        tenant?: string | null;
        allowedRoutes?: string[] | null;
      }>('me')
      .pipe(
        tap((response) => {
          const payload = this.extractMePayload(response.data);

          if (!response.success || !payload?.user) {
            this.clear();
            return;
          }

          // IMPORTANT:
          // Do NOT update allowedRoutes, user, role, navigation, or session data here.
          // The `/me` endpoint is intentionally used only to validate the token.
          // Role switching will refresh allowedRoutes explicitly through its own flow.
        }),
        map((response) => {
          const payload = this.extractMePayload(response.data);
          return !!response.success && !!payload?.user;
        }),
        catchError(() => {
          this.clear();
          return of(false);
        }),
        finalize(() => {
          this.sessionValidationRequest = null;
        }),
        shareReplay(1),
      );

    return this.sessionValidationRequest;
  }

  /**
   * Rebuilds session state from localStorage and, when a token exists,
   * revalidates it against the backend.
   */
  restoreSessionFromApi(): Observable<boolean> {
    this.hydrateFromStorage();
    return this.validateSession();
  }

  /**
   * Safely narrows the `me` endpoint payload coming from ApiService.
   */
  private extractMePayload(data: unknown): {
    user: AuthUser | null;
    context: 'central' | 'tenant' | null;
    tenant?: string | null;
    allowedRoutes?: string[] | null;
  } | null {
    if (!data || typeof data !== 'object' || !('user' in data) || !('context' in data)) {
      return null;
    }

    return data as {
      user: AuthUser | null;
      context: 'central' | 'tenant' | null;
      tenant?: string | null;
      allowedRoutes?: string[] | null;
    };
  }

  /**
   * Initializes or replaces the current authenticated session.
   *
   * The backend login payload is normalized into the internal `AuthSession`
   * shape before being stored and persisted.
   *
   * @param data Auth session payload returned by the backend.
   */
  setSession(data: {
    token?: string | null;
    token_type?: string | null;
    context?: 'central' | 'tenant' | null;
    tenant?: string | null;
    user?: AuthUser | null;
  }): void {
    const context = data.context ?? null;
    const user = this.serializeUser(data.user ?? null, context);

    const session: AuthSession = {
      token: data.token ?? null,
      tokenType: data.token_type ?? null,
      context,
      tenant: context === 'tenant' ? (data.tenant ?? null) : null,
      user,
    };

    const previous = this.state();
    const authorizationContextChanged =
      previous.context !== session.context ||
      previous.tenant !== session.tenant ||
      previous.user?.id !== session.user?.id ||
      previous.user?.role?.id !== session.user?.role?.id;

    this.state.set(session);
    this.persistToStorage(session);

    if (authorizationContextChanged) {
      this.clearAllowedRoutes();
    }
  }

  /**
   * Rebuilds the reactive session state from localStorage.
   *
   * Invalid or malformed persisted user payloads are ignored safely.
   */
  hydrateFromStorage(): void {
    const token = localStorage.getItem('token');
    const tokenType = localStorage.getItem('token_type');
    const rawContext = localStorage.getItem('app_context');
    const tenant = localStorage.getItem('tenant');
    const context: AuthSession['context'] =
      rawContext === 'tenant' ? 'tenant' : rawContext === 'central' ? 'central' : null;
    const rawUser = localStorage.getItem('user');
    const rawAllowedRoutes = localStorage.getItem('allowed_routes');

    let user: AuthUser | null = null;

    if (rawUser) {
      try {
        user = JSON.parse(rawUser) as AuthUser;
      } catch {
        user = null;
      }
    }

    let allowedRoutes: string[] = [];

    if (rawAllowedRoutes) {
      try {
        const parsedAllowedRoutes = JSON.parse(rawAllowedRoutes);
        allowedRoutes = Array.isArray(parsedAllowedRoutes)
          ? parsedAllowedRoutes.filter(
              (route): route is string => typeof route === 'string' && !!route.trim(),
            )
          : [];
      } catch {
        allowedRoutes = [];
      }
    }

    this.state.set({
      token,
      tokenType,
      context,
      tenant: context === 'tenant' ? tenant : null,
      user,
    });
    this.allowedRoutesState.set(allowedRoutes);
  }

  /**
   * Updates only the active role in the current session.
   *
   * Useful for future role-switching flows where the authenticated identity
   * remains the same but the active role changes.
   *
   * @param role New active role to apply.
   */
  setActiveRole(role: AuthRole): void {
    this.state.update((current) => {
      if (!current.user) {
        return current;
      }

      const next: AuthSession = {
        ...current,
        user: {
          ...current.user,
          role,
          role_id: role.id,
        },
      };

      this.persistToStorage(next);
      this.clearAllowedRoutes();
      return next;
    });
  }

  /**
   * Clears the current authenticated session from memory and storage.
   */
  clear(): void {
    this.state.set({
      token: null,
      tokenType: null,
      context: null,
      tenant: null,
      user: null,
    });
    this.allowedRoutesState.set([]);
    this.sessionValidationRequest = null;

    localStorage.removeItem('token');
    localStorage.removeItem('token_type');
    localStorage.removeItem('user');
    localStorage.removeItem('app_context');
    localStorage.removeItem('tenant');
    localStorage.removeItem('allowed_routes');
  }

  /**
   * Builds initials from a full name when explicit initials are not available.
   *
   * Uses up to the first two non-empty name segments.
   *
   * @param name Full display name.
   * @returns Derived initials or null when the name is empty.
   */
  private buildInitials(name: string | null | undefined): string | null {
    if (!name?.trim()) {
      return null;
    }

    const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

    if (!parts.length) {
      return null;
    }

    return parts.map((part) => part.charAt(0).toUpperCase()).join('');
  }

  /**
   * Returns a reduced and safer user payload for localStorage persistence.
   *
   * This avoids storing unnecessary session data while preserving what the UI
   * needs to rebuild the authenticated state after refresh.
   *
   * @param user Full authenticated user.
   * @returns Reduced user payload or null when no user exists.
   */
  private serializeUser(
    user: AuthUser | null | undefined,
    context: AuthSession['context'] = this.context(),
  ): AuthUser | null {
    if (!user) {
      return null;
    }

    const serializedPerson = this.serializePerson(user.person, context);
    const serializedRole = this.serializeRole(user.role);
    const serializedRoles = (user.roles ?? [])
      .map((role) => this.serializeRole(role))
      .filter((role): role is AuthRole => role !== undefined);

    return {
      id: user.id,
      name: user.person?.full_name || user.name,
      email: user.email ?? undefined,
      initials:
        user.person?.initials ??
        user.initials ??
        this.buildInitials(user.person?.full_name || user.name) ??
        undefined,
      role_id: user.role_id ?? user.role?.id,
      photo: user.photo ?? undefined,
      person: serializedPerson ?? null,
      role: serializedRole,
      roles: serializedRoles,
    };
  }

  /**
   * Returns a minimal person payload for localStorage persistence.
   *
   * @param person Related person data.
   * @returns Minimal persisted person payload or null.
   */
  private serializePerson(
    person: AuthPerson | null | undefined,
    context: AuthSession['context'] = this.context(),
  ): AuthPerson | null {
    if (!person) {
      return null;
    }

    return {
      picture: person.picture ?? null,
      photo: context === 'tenant' ? (person.photo ?? null) : null,
      initials: person.initials ?? null,
      full_name: person.full_name ?? null,
    } as AuthPerson;
  }

  /**
   * Returns a reduced role payload for localStorage persistence.
   *
   * @param role Full role data.
   * @returns Minimal persisted role payload or undefined.
   */
  private serializeRole(role: AuthRole | null | undefined): AuthRole | undefined {
    if (!role) {
      return undefined;
    }

    return {
      id: role.id,
      name: role.name,
      path: role.path,
    };
  }

  /**
   * Persists the allowed route/resource keys in localStorage.
   */
  private persistAllowedRoutes(routes: string[]): void {
    if (routes.length) {
      localStorage.setItem('allowed_routes', JSON.stringify(routes));
      return;
    }

    localStorage.removeItem('allowed_routes');
  }

  /**
   * Persists session values in localStorage.
   *
   * Existing keys are removed when their corresponding session values are null.
   *
   * @param session Session state to persist.
   */
  private persistToStorage(session: AuthSession): void {
    if (session.token) {
      localStorage.setItem('token', session.token);
    } else {
      localStorage.removeItem('token');
    }

    if (session.tokenType) {
      localStorage.setItem('token_type', session.tokenType);
    } else {
      localStorage.removeItem('token_type');
    }

    if (session.context) {
      localStorage.setItem('app_context', session.context);
    } else {
      localStorage.removeItem('app_context');
    }

    if (session.context === 'tenant' && session.tenant) {
      localStorage.setItem('tenant', session.tenant);
    } else {
      localStorage.removeItem('tenant');
    }

    const serializedUser = this.serializeUser(session.user, session.context);

    if (serializedUser) {
      localStorage.setItem('user', JSON.stringify(serializedUser));
    } else {
      localStorage.removeItem('user');
    }
  }
}
