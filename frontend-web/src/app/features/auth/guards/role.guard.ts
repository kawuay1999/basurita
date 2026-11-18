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
  if (userRole === 'administrador') {
    router.navigate(['/admin']);
  } else if (userRole === 'operador') {
    router.navigate(['/operador']);
  } else if (userRole === 'ciudadano') {
    router.navigate(['/ciudadano']);
  } else {
    router.navigate(['/auth/login']);
  }

  return false;
};