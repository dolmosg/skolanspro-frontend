import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthStateSevice } from '../services/auth-state-sevice';

export const authGuard: CanActivateFn = () => {
  const authState = inject(AuthStateSevice);
  const router = inject(Router);

  if (!authState.hasToken()) {
    authState.clear();
    return router.createUrlTree(['/login']);
  }

  return authState.restoreSessionFromApi().pipe(
    map((isValid) => (isValid ? true : router.createUrlTree(['/login']))),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};