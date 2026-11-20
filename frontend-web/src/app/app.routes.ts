import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { AdminLayoutComponent } from './features/admin/layout/admin-layout.component';
import { DashboardComponent } from './features/admin/pages/dashboard/dashboard.component';
import { IncidenciasComponent } from './features/admin/pages/incidencias/incidencias.component';
import { CamionesComponent } from './features/admin/pages/camiones/camiones.component';
import { ReportesComponent } from './features/admin/pages/reportes/reportes.component';
import { OperadoresComponent } from './features/admin/pages/operadores/operadores.component';
import { AsignacionesComponent } from './features/admin/pages/asignaciones/asignaciones.component';
import { UsuariosComponent } from './features/admin/pages/usuarios/usuarios.component';
import { roleGuard } from './features/auth/guards/role.guard';

export const routes: Routes = [
  { path: 'auth/login', component: LoginComponent },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [roleGuard],
    data: { roles: ['administrador'] },
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'incidencias', component: IncidenciasComponent },
      { path: 'camiones', component: CamionesComponent },
      { path: 'reportes', component: ReportesComponent },
      { path: 'operadores', component: OperadoresComponent },
      { path: 'asignaciones', component: AsignacionesComponent },
      { path: 'usuarios', component: UsuariosComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: 'auth/login' }
];