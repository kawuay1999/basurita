import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo las peticiones a NUESTRO backend llevan el token.
  // Servicios externos (mapas, direcciones) nunca deben recibirlo.
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const router = inject(Router);
  const token = localStorage.getItem('token');

  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      })
    : req.clone({
        setHeaders: {
          Accept: 'application/json'
        }
      });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.navigate(['/auth/login']);
      }
      // RNF-23: Nunca propagar excepciones crudas de servidor al usuario
      let mensajeAmigable: string;
      if (error.status === 0) {
        // No llegó al servidor: sin internet, servidor apagado o dirección equivocada
        mensajeAmigable = 'No se pudo conectar con el servidor. Revisa tu conexión a internet e intenta de nuevo.';
      } else if (error.status >= 500) {
        mensajeAmigable = 'El servidor tuvo un problema. Intenta de nuevo en unos minutos.';
      } else if (error.status === 429) {
        mensajeAmigable = error.error?.mensaje || 'Demasiados intentos. Espera un momento e intenta de nuevo.';
      } else {
        mensajeAmigable =
          error.error?.mensaje ||
          error.error?.message ||
          'No se pudo completar la operación en este momento. Intenta de nuevo.';
      }

      return throwError(() => ({
        status: error.status,
        mensaje: mensajeAmigable
      }));
    })
  );
};
