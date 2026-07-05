import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  /**
   * Añade withCredentials true a todas las peticiones
   * Le dice al navegador que debe enviar las cookies con la petición
   */

  const authReq = req.clone({
    withCredentials: true,
  });
  return next(authReq);
};
