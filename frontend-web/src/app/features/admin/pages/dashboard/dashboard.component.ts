import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-bold text-basurita-text">Monitor Global</h1>
      
      <!-- Stats Row -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white p-6 rounded-softer shadow-soft border border-gray-100 flex items-center gap-4">
          <div class="p-4 bg-blue-50 rounded-soft"><svg class="w-6 h-6 text-basurita-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg></div>
          <div><p class="text-sm text-basurita-muted font-medium">Unidades en Ruta</p><p class="text-2xl font-black">12</p></div>
        </div>
        <div class="bg-white p-6 rounded-softer shadow-soft border border-gray-100 flex items-center gap-4">
          <div class="p-4 bg-orange-50 rounded-soft"><svg class="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></div>
          <div><p class="text-sm text-basurita-muted font-medium">Incidencias Activas</p><p class="text-2xl font-black text-orange-600">3</p></div>
        </div>
      </div>

      <!-- Mapa -->
      <div class="bg-white p-4 rounded-softer shadow-soft border border-gray-100 h-600px flex flex-col">
        <h2 class="text-lg font-bold text-basurita-text mb-4 px-2">Ubicación en Tiempo Real</h2>
        <div id="admin-map" class="flex-1 w-full rounded-soft z-0"></div>
      </div>
    </div>
  `,
  styles: [`#admin-map { width: 100%; height: 100%; }`]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private map!: L.Map;
  private markers: { [id: string]: L.Marker } = {};
  private updateInterval: any;

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    setTimeout(() => {
      this.initMap();
      this.loadUnidades();
      // Polling cada 10s
      this.updateInterval = setInterval(() => this.loadUnidades(), 10000);
    }, 100);
  }

  ngOnDestroy() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.map) this.map.remove();
  }

  private initMap() {
    this.map = L.map('admin-map').setView([19.4326, -99.1332], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap'
    }).addTo(this.map);
  }

  private loadUnidades() {
    this.adminService.getUnidadesActivas().subscribe({
      next: (res: any) => {
        // Asumiendo que res.data es un array de camiones con {id, lat, lng, economico, ruta}
        res.data?.forEach((unidad: any) => {
          if (this.markers[unidad.id]) {
            this.markers[unidad.id].setLatLng([unidad.lat, unidad.lng]);
          } else {
            const icon = L.divIcon({
              className: 'basurita-pin basurita-pin-truck',
              html: `<div class="text-white text-xs font-bold mt-1">${unidad.economico}</div>`,
              iconSize: [40, 40]
            });
            this.markers[unidad.id] = L.marker([unidad.lat, unidad.lng], { icon })
              .bindPopup(`<b>Unidad:</b> ${unidad.economico}<br><b>Ruta:</b> ${unidad.ruta}`)
              .addTo(this.map);
          }
        });
      }
    });
  }
}