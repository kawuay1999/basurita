import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-layout.component.html'
})
export class AdminLayoutComponent {
  menuItems = [
  { label: 'Mapa en Vivo', route: '/admin/dashboard', icon: 'map' },
  { label: 'Incidencias', route: '/admin/incidencias', icon: 'alert' },
  { label: 'Camiones', route: '/admin/camiones', icon: 'truck' },
  { label: 'Reportes', route: '/admin/reportes', icon: 'file' }
];

  constructor(private router: Router) {}

  logout() {
    localStorage.clear();
    this.router.navigate(['/auth/login']);
  }
}