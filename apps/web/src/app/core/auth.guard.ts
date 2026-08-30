import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.readyWait;
  if (auth.getToken()) return true;
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const staffGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.readyWait;
  if (auth.getToken() && auth.user()?.role === 'staff') return true;
  if (auth.getToken()) return router.createUrlTree(['/']);
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
