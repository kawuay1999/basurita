import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
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
      const mensajeAmigable =
        error.error?.mensaje ||
        'No se pudo completar la operación en este momento. Intenta de nuevo.';

      return throwError(() => ({
        status: error.status,
        mensaje: mensajeAmigable
      }));
    })
  );
};