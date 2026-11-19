import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import * as L from 'leaflet';
import { AdminService } from '../../services/admin.service';
import { DashboardService } from '../../../dashboard/services/dashboard.service';

interface Segmento {
  clave: string;
  etiqueta: string;
  descripcion: string;
  color: string;
  valor: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-basurita-text">Monitor global</h1>
          <p class="text-sm text-basurita-muted">Se actualiza solo cada 10 segundos.</p>
        </div>
        <a routerLink="/admin/asignaciones" class="px-4 py-2.5 rounded-soft bg-basurita-primary text-white font-semibold shadow-soft hover:bg-basurita-primary-dark">Asignar rutas</a>
      </div>

      <!-- Indicadores del día -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div *ngFor="let k of indicadores" class="bg-white p-5 rounded-softer shadow-soft border border-gray-100">
          <p class="text-sm text-basurita-muted font-medium">{{ k.etiqueta }}</p>
          <p class="text-3xl font-black text-basurita-text mt-1">{{ k.valor }}</p>
          <p class="text-xs text-basurita-muted mt-1">{{ k.detalle }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <!-- Gráfica: estatus de las unidades -->
        <section class="bg-white p-6 rounded-softer shadow-soft border border-gray-100" aria-labelledby="titulo-estatus">
          <h2 id="titulo-estatus" class="text-lg font-bold text-basurita-text">Estatus de las unidades</h2>
          <p class="text-sm text-basurita-muted mb-5">{{ totalCamiones }} camiones registrados</p>

          <!-- Barra apilada: cada camión cuenta en un solo estatus -->
          <div class="relative">
            <div class="flex h-9 w-full rounded-[4px] overflow-hidden bg-gray-100 gap-[2px]" role="img"
                 [attr.aria-label]="resumenAccesible">
              <div *ngFor="let s of segmentosVisibles" class="h-full first:rounded-l-[4px] last:rounded-r-[4px] transition-all duration-500 cursor-default"
                   [style.width.%]="porcentaje(s)" [style.background]="s.color"
                   (mouseenter)="hover = s" (mouseleave)="hover = null"></div>
            </div>
            <div *ngIf="hover" class="absolute -top-12 left-1/2 -translate-x-1/2 bg-basurita-text text-white text-xs font-semibold px-3 py-2 rounded-soft shadow-floating whitespace-nowrap pointer-events-none">
              {{ hover.etiqueta }}: {{ hover.valor }} ({{ porcentaje(hover) | number:'1.0-0' }}%)
            </div>
          </div>

          <!-- Leyenda + tabla de valores -->
          <ul class="mt-5 space-y-3">
            <li *ngFor="let s of segmentos" class="flex items-center gap-3" (mouseenter)="hover = s" (mouseleave)="hover = null">
              <span class="w-3 h-3 rounded-[3px] shrink-0" [style.background]="s.color" aria-hidden="true"></span>
              <span class="flex-1 min-w-0">
                <span class="block text-sm font-semibold text-basurita-text">{{ s.etiqueta }}</span>
                <span class="block text-xs text-basurita-muted">{{ s.descripcion }}</span>
              </span>
              <span class="text-lg font-black text-basurita-text tabular-nums">{{ s.valor }}</span>
            </li>
          </ul>
        </section>

        <!-- Mapa en vivo -->
        <section class="xl:col-span-2 bg-white p-4 rounded-softer shadow-soft border border-gray-100 flex flex-col min-h-[480px]">
          <div class="flex items-center justify-between px-2 mb-3">
            <h2 class="text-lg font-bold text-basurita-text">Camiones en tiempo real</h2>
            <span class="text-xs font-semibold text-basurita-muted">{{ unidadesEnMapa }} en el mapa</span>
          </div>
          <div id="admin-map" class="flex-1 w-full rounded-soft z-0"></div>
        </section>
      </div>
    </div>
  `,
  styles: [`#admin-map { width: 100%; height: 100%; min-height: 420px; }`]
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Paleta validada (incluye daltonismo) — el color sigue al estatus, no a su posición
  segmentos: Segmento[] = [
    { clave: 'en_ruta', etiqueta: 'En ruta', descripcion: 'Circulando ahora con su operador', color: '#16A34A', valor: 0 },
    { clave: 'programado', etiqueta: 'Programado', descripcion: 'Tiene ruta hoy, aún no sale', color: '#2563EB', valor: 0 },
    { clave: 'disponible', etiqueta: 'Disponible', descripcion: 'Activo y sin ruta asignada hoy', color: '#0891B2', valor: 0 },
    { clave: 'mantenimiento', etiqueta: 'En mantenimiento', descripcion: 'En taller, no puede salir', color: '#D97706', valor: 0 },
    { clave: 'baja', etiqueta: 'Dado de baja', descripcion: 'Fuera de servicio', color: '#BE123C', valor: 0 }
  ];
  hover: Segmento | null = null;
  totalCamiones = 0;
  indicadores = [
    { etiqueta: 'Unidades en ruta', valor: 0 as number | string, detalle: 'Ahora mismo' },
    { etiqueta: 'Rutas de hoy', valor: 0 as number | string, detalle: '' },
    { etiqueta: 'Incidencias abiertas', valor: 0 as number | string, detalle: 'Nuevas o en atención' },
    { etiqueta: 'Ciudadanos registrados', valor: 0 as number | string, detalle: '' }
  ];
  unidadesEnMapa = 0;

  private map?: L.Map;
  private markers: { [id: string]: L.Marker } = {};
  private updateInterval: any;
  private primeraVez = true;

  constructor(private adminService: AdminService, private dashboardService: DashboardService) {}

  ngOnInit() {
    setTimeout(() => {
      this.initMap();
      this.actualizar();
      this.updateInterval = setInterval(() => this.actualizar(), 10000);
    }, 100);
  }

  ngOnDestroy() {
    clearInterval(this.updateInterval);
    this.map?.remove();
  }

  get segmentosVisibles(): Segmento[] {
    return this.segmentos.filter((s) => s.valor > 0);
  }

  get resumenAccesible(): string {
    return 'Estatus de las unidades: ' + this.segmentos.map((s) => `${s.etiqueta} ${s.valor}`).join(', ');
  }

  porcentaje(s: Segmento): number {
    const total = this.segmentos.reduce((a, b) => a + b.valor, 0);
    return total ? (s.valor / total) * 100 : 0;
  }

  private actualizar(): void {
    this.cargarEstadisticas();
    this.cargarUnidades();
  }

  private cargarEstadisticas(): void {
    this.dashboardService.getEstadisticas().subscribe({
      next: (res: any) => {
        const d = res.data ?? {};
        const estatus = d.camiones_por_estatus ?? {};
        this.segmentos.forEach((s) => (s.valor = Number(estatus[s.clave] ?? 0)));
        this.totalCamiones = d.total_camiones ?? 0;

        const j = d.jornadas_hoy ?? {};
        const totalRutas = (j.programada ?? 0) + (j.en_curso ?? 0) + (j.finalizada ?? 0);
        this.indicadores[0].valor = d.unidades_activas ?? 0;
        this.indicadores[1].valor = totalRutas;
        this.indicadores[1].detalle = `${j.finalizada ?? 0} terminadas · ${j.programada ?? 0} por salir`;
        this.indicadores[2].valor = d.incidencias_abiertas ?? 0;
        this.indicadores[3].valor = d.ciudadanos_registrados ?? 0;
        this.indicadores[3].detalle = `${d.operadores ?? 0} operadores`;
      }
    });
  }

  private initMap() {
    this.map = L.map('admin-map').setView([19.7128, -98.9684], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap'
    }).addTo(this.map);
  }

  private cargarUnidades() {
    this.adminService.getUnidadesActivas().subscribe({
      next: (res: any) => {
        const vistos = new Set<string>();
        (res.data ?? []).forEach((u: any) => {
          const lat = u.ubicacion?.lat, lng = u.ubicacion?.lng;
          if (lat == null || lng == null) return;
          const id = String(u.jornada_id);
          vistos.add(id);
          const economico = u.camion?.numero_economico ?? 'Unidad';
          const sinSenal = u.ubicacion?.estado_conexion === 'sin_senal';
          const popup = `<b>${economico}</b><br>Operador: ${u.operador}<br>Ruta: ${u.ruta}${sinSenal ? '<br><i>Sin señal reciente</i>' : ''}`;

          if (this.markers[id]) {
            this.markers[id].setLatLng([lat, lng]).setPopupContent(popup);
          } else {
            const icon = L.divIcon({
              className: '',
              html: `<div style="background:#16A34A;color:#fff;border:3px solid #fff;border-radius:9999px;padding:4px 10px;font:700 12px sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.25);white-space:nowrap">${economico}</div>`,
              iconSize: [80, 30],
              iconAnchor: [40, 15]
            });
            this.markers[id] = L.marker([lat, lng], { icon }).bindPopup(popup).addTo(this.map!);
          }
        });

        // Quita camiones que ya terminaron su ruta
        Object.keys(this.markers).forEach((id) => {
          if (!vistos.has(id)) {
            this.markers[id].remove();
            delete this.markers[id];
          }
        });
        this.unidadesEnMapa = vistos.size;

        if (this.primeraVez && vistos.size > 0 && this.map) {
          this.map.fitBounds(L.featureGroup(Object.values(this.markers)).getBounds(), { padding: [60, 60], maxZoom: 16 });
          this.primeraVez = false;
        }
      }
    });
  }
}
