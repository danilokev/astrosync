import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, switchMap, of } from 'rxjs';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();
  if (user) {
    if (user.rol === 'ROL_ADMIN') return true;
    return router.parseUrl('/');
  }

  return authService.checkAuthentication().pipe(
    map((isAuth) => {
      const currentUser = authService.currentUser();
      if (isAuth && currentUser?.rol === 'ROL_ADMIN') {
        return true;
      }
      return router.parseUrl('/');
    })
  );
};