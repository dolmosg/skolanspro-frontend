import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { NavigationService } from './navigation-service';
import { AuthStateSevice } from './auth-state-sevice';
import { ToastService } from './toast-service';
import { of, timer } from 'rxjs';
import { catchError, filter, map, take } from 'rxjs/operators';

export const accessGuard: CanActivateFn = (_route, state) => {
  const authState = inject(AuthStateSevice);
  const navigation = inject(NavigationService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const buildFallback = () => {
    const fallback = authState.activeRole()?.path ?? '/auth/login';
    const context = authState.context();

    if (!context) {
      return router.createUrlTree(['/auth/login']);
    }

    return router.createUrlTree([`/${context}${fallback}`]);
  };

  const resolveAccess = () => {
    let currentRoute = _route;

    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    const accessRoute = currentRoute.data?.['access']?.route ?? currentRoute.data?.['api']?.route;

    const accessKey = accessRoute ? `/${accessRoute}` : null;

    const hasAccess = accessKey
      ? authState.hasAccess(accessKey)
      : navigation.hasRouteAccess(state.url);

    if (!hasAccess) {
      toast.warning('No tienes acceso a esta ruta');
      return buildFallback();
    }

    return true;
  };

  let currentRoute = _route;

  while (currentRoute.firstChild) {
    currentRoute = currentRoute.firstChild;
  }

  const requiresExplicitAccess =
    !!currentRoute.data?.['access']?.route || !!currentRoute.data?.['api']?.route;

  if (requiresExplicitAccess) {
    if (authState.allowedRoutes().length > 0) {
      return resolveAccess();
    }

    if (!navigation.loading()) {
      navigation.load(true);
    }

    return timer(0, 25).pipe(
      filter(() => !navigation.loading() || !authState.hasToken()),
      take(1),
      map(() => resolveAccess()),
      catchError(() => of(false)),
    );
  }

  if (navigation.items().length > 0) {
    return resolveAccess();
  }

  if (!navigation.loading()) {
    navigation.load();
  }

  return timer(0, 25).pipe(
    filter(() => (!navigation.loading() && navigation.items().length > 0) || !authState.hasToken()),
    take(1),
    map(() => resolveAccess()),
    catchError(() => of(false)),
  );
};
