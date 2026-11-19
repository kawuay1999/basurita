import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { forkJoin } from 'rxjs';
import { JornadaService } from '../../../asignaciones/services/jornada.service';
import { OperadorService } from '../../../operadores/services/operador.service';
import { CamionService } from '../../../camiones/services/camion.service';
import { RutaService } from '../../../rutas/services/ruta.service';

/**
 * Asignar rutas: el admin elige operador + camión + ruta + fecha.
 * El operador la ve en su app al entrar ("Tu ruta de hoy") y le llega un aviso.
 */
@Component({
  selector: 'app-admin-asignaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-basurita-text">Asignar rutas</h1>
        <p class="text-sm text-basurita-muted">Elige quién maneja, en qué camión y qué recorrido hace. El operador lo verá en su app.</p>
      </div>

      <div *ngIf="aviso" role="status" class="p-3 rounded-soft text-sm font-semibold"
           [ngClass]="avisoError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'">{{ aviso }}</div>

      <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <!-- Formulario -->
        <form (ngSubmit)="asignar()" class="xl:col-span-2 bg-white rounded-softer shadow-soft border border-gray-100 p-6 space-y-4">
          <h2 class="text-lg font-bold">Nueva asignación</h2>

          <div>
            <label class="block text-sm font-medium mb-1" for="a-fecha">Fecha</label>
            <input id="a-fecha" type="date" name="fecha" [(ngModel)]="nueva.fecha" (ngModelChange)="fechaFiltro = $event" class="input-base">
          </div>

          <div>
            <label class="block text-sm font-medium mb-1" for="a-op">Operador</label>
            <select id="a-op" name="operador" [(ngModel)]="nueva.operador_id" class="input-base">
              <option [ngValue]="null">Selecciona un operador</option>
              <option *ngFor="let o of operadores" [ngValue]="o.id" [disabled]="ocupadoOperador(o.id)">
                {{ o.name }}{{ ocupadoOperador(o.id) ? ' (ya tiene ruta ese día)' : '' }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1" for="a-cam">Camión</label>
            <select id="a-cam" name="camion" [(ngModel)]="nueva.camion_id" class="input-base">
              <option [ngValue]="null">Selecciona un camión</option>
              <option *ngFor="let c of camiones" [ngValue]="c.id" [disabled]="ocupadoCamion(c.id)">
                {{ c.numero_economico }} · {{ c.placa }}{{ ocupadoCamion(c.id) ? ' (ocupado ese día)' : '' }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1" for="a-ruta">Ruta</label>
            <select id="a-ruta" name="ruta" [(ngModel)]="nueva.ruta_id" (ngModelChange)="verRuta($event)" class="input-base">
              <option [ngValue]="null">Selecciona una ruta</option>
              <option *ngFor="let r of rutas" [ngValue]="r.id">{{ r.nombre }}</option>
            </select>
            <p *ngIf="rutaSeleccionada" class="text-xs text-basurita-muted mt-1">
              {{ coloniasDe(rutaSeleccionada) || 'Sin colonias' }}
              <span *ngIf="!rutaSeleccionada.recorrido?.length" class="text-amber-700"> · Esta ruta aún no tiene recorrido dibujado.</span>
            </p>
          </div>

          <!-- Vista previa del recorrido -->
          <div class="h-56 rounded-soft overflow-hidden border border-gray-200 relative">
            <div id="mapa-asignacion" class="absolute inset-0 z-0"></div>
            <div *ngIf="!rutaSeleccionada" class="absolute inset-0 z-[500] bg-white/80 flex items-center justify-center text-sm text-basurita-muted">
              Elige una ruta para ver su recorrido
            </div>
          </div>

          <button type="submit" [disabled]="guardando"
                  class="w-full py-3 rounded-soft bg-basurita-primary text-white font-bold shadow-soft hover:bg-basurita-primary-dark disabled:opacity-60">
            {{ guardando ? 'Asignando...' : 'Asignar ruta' }}
          </button>
        </form>

        <!-- Asignaciones del día -->
        <div class="xl:col-span-3 bg-white rounded-softer shadow-soft border border-gray-100 overflow-hidden">
          <div class="p-5 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100">
            <h2 class="text-lg font-bold">Rutas del {{ fechaFiltro | date:'dd/MM/yyyy' }}</h2>
            <input type="date" [(ngModel)]="fechaFiltro" name="filtro" aria-label="Ver asignaciones de otra fecha"
                   class="border border-gray-200 rounded-soft px-3 py-2 text-sm">
          </div>

          <div *ngIf="cargando" class="p-6 text-center text-basurita-muted">Cargando...</div>
          <div *ngIf="!cargando && delDia.length === 0" class="p-8 text-center text-basurita-muted">No hay rutas asignadas para esta fecha.</div>

          <ul class="divide-y divide-gray-100">
            <li *ngFor="let j of delDia" class="p-5 flex flex-wrap items-center gap-4">
              <span class="w-10 h-10 rounded-full bg-basurita-primary text-white font-bold flex items-center justify-center shrink-0">
                {{ (j.operador?.name || '?').charAt(0).toUpperCase() }}
              </span>
              <div class="flex-1 min-w-48">
                <p class="font-semibold text-basurita-text">{{ j.operador?.name || 'Sin operador' }}</p>
                <p class="text-sm text-basurita-muted">{{ j.ruta?.nombre }} · Camión {{ j.camion?.numero_economico }}</p>
              </div>
              <span class="px-3 py-1 rounded-full text-xs font-bold" [ngClass]="claseEstado(j.estado)">{{ textoEstado(j.estado) }}</span>
              <div class="flex gap-3 text-sm font-semibold">
                <button *ngIf="j.estado === 'programada'" (click)="cancelar(j)" class="text-amber-700 hover:underline">Cancelar</button>
                <button *ngIf="j.estado !== 'en_curso'" (click)="eliminar(j)" class="text-red-600 hover:underline">Eliminar</button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  `
})
export class AsignacionesComponent implements OnInit, AfterViewInit, OnDestroy {
  operadores: any[] = [];
  camiones: any[] = [];
  rutas: any[] = [];
  jornadas: any[] = [];
  cargando = true;
  guardando = false;
  aviso = '';
  avisoError = false;

  fechaFiltro = this.hoy();
  nueva: { fecha: string; operador_id: number | null; camion_id: number | null; ruta_id: number | null } = {
    fecha: this.hoy(), operador_id: null, camion_id: null, ruta_id: null
  };
  rutaSeleccionada: any = null;

  private map?: L.Map;
  private capaRuta?: L.LayerGroup;

  constructor(
    private jornadaService: JornadaService,
    private operadorService: OperadorService,
    private camionService: CamionService,
    private rutaService: RutaService
  ) {}

  ngOnInit(): void {
    forkJoin({
      operadores: this.operadorService.getAll(),
      camiones: this.camionService.getActivos(),
      rutas: this.rutaService.getAll()
    }).subscribe({
      next: (r: any) => {
        this.operadores = r.operadores.data ?? [];
        this.camiones = r.camiones.data ?? [];
        this.rutas = (r.rutas.data ?? []).filter((x: any) => x.activa !== false);
      },
      error: (err: any) => this.mostrar(err?.mensaje || 'No se pudieron cargar operadores, camiones o rutas.', true)
    });
    this.cargarJornadas();
  }

  ngAfterViewInit(): void {
    this.map = L.map('mapa-asignacion', { zoomControl: false, attributionControl: false }).setView([19.7128, -98.9684], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this.map);
    this.capaRuta = L.layerGroup().addTo(this.map);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  get delDia(): any[] {
    return this.jornadas.filter((j) => String(j.fecha).substring(0, 10) === this.fechaFiltro);
  }

  cargarJornadas(): void {
    this.cargando = true;
    this.jornadaService.getAll().subscribe({
      next: (res: any) => {
        this.jornadas = res.data ?? [];
        this.cargando = false;
      },
      error: (err: any) => {
        this.cargando = false;
        this.mostrar(err?.mensaje || 'No se pudieron cargar las asignaciones.', true);
      }
    });
  }

  private activasEnFecha(): any[] {
    return this.jornadas.filter((j) =>
      String(j.fecha).substring(0, 10) === this.nueva.fecha && ['programada', 'en_curso'].includes(j.estado));
  }

  ocupadoOperador(id: number): boolean {
    return this.activasEnFecha().some((j) => j.operador_id === id);
  }

  ocupadoCamion(id: number): boolean {
    return this.activasEnFecha().some((j) => j.camion_id === id);
  }

  coloniasDe(r: any): string {
    return (r.colonias ?? []).map((c: any) => c.nombre).join(', ');
  }

  verRuta(id: number | null): void {
    this.rutaSeleccionada = this.rutas.find((r) => r.id === id) ?? null;
    this.capaRuta?.clearLayers();
    const puntos = (this.rutaSeleccionada?.recorrido ?? []) as [number, number][];
    if (!this.map || puntos.length < 2) return;

    L.polyline(puntos, { color: '#ffffff', weight: 9 }).addTo(this.capaRuta!);
    const linea = L.polyline(puntos, { color: '#16A34A', weight: 5 }).addTo(this.capaRuta!);
    L.circleMarker(puntos[0], { radius: 7, color: '#fff', weight: 3, fillColor: '#16A34A', fillOpacity: 1 })
      .bindTooltip('Inicio').addTo(this.capaRuta!);
    L.circleMarker(puntos[puntos.length - 1], { radius: 7, color: '#fff', weight: 3, fillColor: '#1E293B', fillOpacity: 1 })
      .bindTooltip('Fin').addTo(this.capaRuta!);
    this.map.fitBounds(linea.getBounds(), { padding: [20, 20] });
  }

  asignar(): void {
    const n = this.nueva;
    if (!n.fecha || !n.operador_id || !n.camion_id || !n.ruta_id) {
      this.mostrar('Elige fecha, operador, camión y ruta.', true);
      return;
    }
    this.guardando = true;
    this.jornadaService.createJornada(n).subscribe({
      next: () => {
        this.guardando = false;
        const op = this.operadores.find((o) => o.id === n.operador_id)?.name ?? 'El operador';
        this.mostrar(`Ruta asignada. ${op} ya la puede ver en su app.`);
        this.nueva = { ...n, operador_id: null, camion_id: null };
        this.fechaFiltro = n.fecha;
        this.cargarJornadas();
      },
      error: (err: any) => {
        this.guardando = false;
        this.mostrar(err?.mensaje || 'No se pudo asignar la ruta.', true);
      }
    });
  }

  cancelar(j: any): void {
    if (!confirm(`¿Cancelar la ruta de ${j.operador?.name}? Ya no le aparecerá en su app.`)) return;
    this.jornadaService.updateJornada(j.id, { estado: 'cancelada' }).subscribe({
      next: () => { this.mostrar('Ruta cancelada.'); this.cargarJornadas(); },
      error: (err: any) => this.mostrar(err?.mensaje || 'No se pudo cancelar.', true)
    });
  }

  eliminar(j: any): void {
    if (!confirm(`¿Eliminar esta asignación de ${j.operador?.name}? También se borra su recorrido GPS.`)) return;
    this.jornadaService.deleteJornada(j.id).subscribe({
      next: () => { this.mostrar('Asignación eliminada.'); this.cargarJornadas(); },
      error: (err: any) => this.mostrar(err?.mensaje || 'No se pudo eliminar.', true)
    });
  }

  textoEstado(e: string): string {
    return ({ programada: 'Programada', en_curso: 'En ruta', finalizada: 'Terminada', cancelada: 'Cancelada' } as any)[e] ?? e;
  }

  claseEstado(e: string): string {
    return ({
      programada: 'bg-blue-50 text-blue-800',
      en_curso: 'bg-green-100 text-green-800',
      finalizada: 'bg-gray-100 text-gray-700',
      cancelada: 'bg-red-50 text-red-700'
    } as any)[e] ?? 'bg-gray-100 text-gray-700';
  }

  private hoy(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private mostrar(msg: string, error = false): void {
    this.aviso = msg;
    this.avisoError = error;
    setTimeout(() => (this.aviso = ''), 6000);
  }
}
