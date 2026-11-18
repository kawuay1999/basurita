import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { AdminLayoutComponent } from './features/admin/layout/admin-layout.component';
import { DashboardComponent } from './features/admin/pages/dashboard/dashboard.component';
import { IncidenciasComponent } from './features/admin/pages/incidencias/incidencias.component';
import { CamionesComponent } from './features/admin/pages/camiones/camiones.component';
import { ReportesComponent } from './features/admin/pages/reportes/reportes.component';

export const routes: Routes = [
  { path: 'auth/login', component: LoginComponent },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'incidencias', component: IncidenciasComponent },
      { path: 'camiones', component: CamionesComponent },
      { path: 'reportes', component: ReportesComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: 'auth/login' }
];