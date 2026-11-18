import { Routes } from '@angular/router';
import { MapaComponent } from './features/ciudadano/pages/mapa/mapa.component';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { DashboardComponent } from './features/operador/pages/dashboard/dashboard.component';


export const routes: Routes = [
    { path: 'auth/login', component: LoginComponent },
    { path: 'ciudadano/mapa', component: MapaComponent },
    { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
    { path: 'operador/dashboard', component: DashboardComponent }
];
