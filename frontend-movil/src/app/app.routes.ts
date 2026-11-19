import { Routes } from '@angular/router';
import { MapaComponent } from './features/ciudadano/pages/mapa/mapa.component';
import { HistorialComponent } from './features/ciudadano/pages/historial/historial.component';
import { ElegirCasaComponent } from './features/ciudadano/pages/elegir-casa/elegir-casa.component';
import { PerfilComponent } from './features/ciudadano/pages/perfil/perfil.component';
import { AcercaComponent } from './features/ciudadano/pages/acerca/acerca.component';
import { AvisosComponent } from './features/ciudadano/pages/avisos/avisos.component';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { RegisterComponent } from './features/auth/pages/register/register.component';
import { PermisoUbicacionComponent } from './features/auth/pages/permiso-ubicacion/permiso-ubicacion.component';
import { DashboardComponent } from './features/operador/pages/dashboard/dashboard.component';
import { roleGuard } from './features/auth/guards/role.guard';

const CIUDADANO = { roles: ['ciudadano', 'administrador'] };
const CONDUCTOR = { roles: ['operador'] };

export const routes: Routes = [
    { path: 'auth/login', component: LoginComponent },
    { path: 'auth/register', component: RegisterComponent },

    // Después de iniciar sesión (cualquier rol)
    {
        path: 'permiso-ubicacion',
        component: PermisoUbicacionComponent,
        canActivate: [roleGuard],
        data: { roles: ['ciudadano', 'administrador', 'operador'] }
    },

    // Ciudadano
    { path: 'ciudadano/mapa', component: MapaComponent, canActivate: [roleGuard], data: CIUDADANO },
    { path: 'ciudadano/elegir-casa', component: ElegirCasaComponent, canActivate: [roleGuard], data: CIUDADANO },
    { path: 'ciudadano/perfil', component: PerfilComponent, canActivate: [roleGuard], data: CIUDADANO },
    { path: 'ciudadano/historial', component: HistorialComponent, canActivate: [roleGuard], data: CIUDADANO },
    { path: 'ciudadano/acerca', component: AcercaComponent, canActivate: [roleGuard], data: CIUDADANO },
    { path: 'ciudadano/avisos', component: AvisosComponent, canActivate: [roleGuard], data: CIUDADANO },

    // Conductor
    { path: 'operador/dashboard', component: DashboardComponent, canActivate: [roleGuard], data: CONDUCTOR },
    { path: 'operador/perfil', component: PerfilComponent, canActivate: [roleGuard], data: CONDUCTOR },
    { path: 'operador/acerca', component: AcercaComponent, canActivate: [roleGuard], data: CONDUCTOR },

    { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
    { path: '**', redirectTo: 'auth/login' }
];
