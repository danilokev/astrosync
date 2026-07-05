import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si ya está autenticado puede pasar
  if (authService.isAuthenticated()) {
    return true;
  }

  // Si no lo está, llama al check del backend
  return authService.checkAuthentication().pipe(
    map((isAutenticated) => {
      if (isAutenticated) {
        return true;
      }

      // si el check falla, redirige al login
      return router.parseUrl('/login');
    })
  );
};
