import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const expectedRoles = route.data['roles'] as Array<string>;
  const userRole = authService.getUserRole();

  if (expectedRoles && expectedRoles.includes(userRole)) {
    return true;
  }

  // Redirección inteligente si no tiene permisos
  // (en la app móvil solo existen las pantallas de operador y ciudadano)
  if (userRole === 'operador') {
    router.navigate(['/operador/dashboard']);
  } else if (userRole === 'ciudadano' || userRole === 'administrador') {
    router.navigate(['/ciudadano/mapa']);
  } else {
    router.navigate(['/auth/login']);
  }

  return false;
};