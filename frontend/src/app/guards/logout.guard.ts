import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs';

export const logoutGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  return authService.checkAuthentication().pipe(
    map((isAutenticated) => {
      if (!isAutenticated) {
        return true;
      }

      // si el check falla, redirige al login
      return router.parseUrl('/app');
    }),
  );
};
