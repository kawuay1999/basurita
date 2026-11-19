import { Component, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';
import { UbicacionDispositivoService } from '../../../../core/services/ubicacion-dispositivo.service';
import { CiudadanoService } from '../../services/ciudadano.service';

/**
 * Elegir la ubicación de la casa al estilo Uber/DiDi:
 * el pin queda fijo en el centro y el usuario mueve el mapa con el dedo.
 * Al soltar, se muestra la dirección de ese punto.
 */
@Component({
  selector: 'app-elegir-casa',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative h-dvh w-screen overflow-hidden bg-basurita-bg">
      <div id="mapa-elegir-casa" class="absolute inset-0 z-0"></div>

      <!-- Pin fijo al centro (no se arrastra: se mueve el mapa debajo) -->
      <div class="pointer-events-none absolute left-1/2 top-1/2 z-[1000] -translate-x-1/2 -translate-y-full flex flex-col items-center transition-[margin] duration-150"
           [style.margin-top.px]="moviendo ? -10 : 0">
        <div class="w-12 h-12 rounded-full bg-basurita-primary border-4 border-white shadow-floating flex items-center justify-center transition-transform">
          <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M11.47 3.84a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.06l-8.69-8.69a2.25 2.25 0 0 0-3.18 0l-8.69 8.69a.75.75 0 1 0 1.06 1.06l8.69-8.69Z"/><path d="m12 5.43 8.16 8.16c.03.03.06.06.09.08v6.2c0 1.04-.84 1.88-1.88 1.88H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.63a1.88 1.88 0 0 1-1.88-1.88v-6.2l.09-.08L12 5.43Z"/></svg>
        </div>
        <div class="w-1 h-4 bg-basurita-primary rounded-b"></div>
      </div>
      <!-- Sombra en el punto exacto -->
      <div class="pointer-events-none absolute left-1/2 top-1/2 z-[999] -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-black/30"></div>

      <!-- Encabezado -->
      <div class="absolute top-0 inset-x-0 z-[1000] p-4">
        <div class="bg-white/95 backdrop-blur rounded-softer shadow-floating p-3 flex items-center gap-3">
          <button *ngIf="!primeraVez" (click)="volver()" aria-label="Regresar"
                  class="w-10 h-10 shrink-0 rounded-full bg-gray-100 flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/></svg>
          </button>
          <div>
            <p class="font-bold text-basurita-text leading-tight">¿Dónde está tu casa?</p>
            <p class="text-xs text-basurita-muted">Mueve el mapa con el dedo hasta que el pin quede en tu casa</p>
          </div>
        </div>
      </div>

      <!-- Botón "mi ubicación" -->
      <button (click)="irAMiUbicacion()" aria-label="Ir a mi ubicación actual"
              class="absolute right-4 bottom-[220px] z-[1000] w-12 h-12 rounded-full bg-white shadow-floating flex items-center justify-center text-basurita-secondary active:scale-95">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path stroke-linecap="round" d="M12 2v3m0 14v3M2 12h3m14 0h3"/><circle cx="12" cy="12" r="7"/></svg>
      </button>

      <!-- Hoja inferior con la dirección -->
      <div class="absolute bottom-0 inset-x-0 z-[1000] bg-white rounded-t-[28px] shadow-floating px-5 pt-5 pb-6">
        <p class="text-xs font-bold uppercase tracking-wide text-basurita-muted mb-1">Tu casa</p>
        <div class="flex items-start gap-3 min-h-[48px]">
          <svg class="w-6 h-6 text-basurita-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/></svg>
          <p class="text-basurita-text font-semibold leading-snug" [class.text-gray-400]="buscandoDireccion">
            {{ buscandoDireccion ? 'Buscando dirección...' : direccion }}
          </p>
        </div>
        <p *ngIf="error" role="alert" class="text-sm text-basurita-danger mt-2">{{ error }}</p>
        <button (click)="confirmar()" [disabled]="guardando || buscandoDireccion || moviendo"
                class="mt-4 w-full py-4 rounded-soft bg-basurita-primary text-white font-bold text-lg shadow-soft active:scale-[0.98] transition disabled:opacity-60">
          {{ guardando ? 'Guardando...' : 'Confirmar ubicación' }}
        </button>
      </div>
    </div>
  `
})
export class ElegirCasaComponent implements AfterViewInit, OnDestroy {
  private map?: L.Map;
  private dirSub?: Subscription;
  private temporizador?: any;

  primeraVez = true;
  direccion = '';
  buscandoDireccion = true;
  moviendo = false;
  guardando = false;
  error = '';

  constructor(
    private ubicacion: UbicacionDispositivoService,
    private ciudadanoService: CiudadanoService,
    private router: Router,
    private zone: NgZone
  ) {}

  async ngAfterViewInit(): Promise<void> {
    const perfil = this.ciudadanoService.perfilLocal();
    const tieneCasa = perfil.latitud_casa != null && perfil.longitud_casa != null;
    this.primeraVez = !tieneCasa;

    // Punto inicial: su casa guardada → su GPS → centro por defecto
    let inicio = tieneCasa
      ? { lat: Number(perfil.latitud_casa), lng: Number(perfil.longitud_casa) }
      : this.ubicacion.CENTRO_DEFECTO;

    this.crearMapa(inicio.lat, inicio.lng);

    if (!tieneCasa) {
      try {
        const pos = await this.ubicacion.obtenerPosicion();
        this.map?.setView([pos.lat, pos.lng], 18);
      } catch {
        this.buscarDireccion();
      }
    }
  }

  ngOnDestroy(): void {
    this.dirSub?.unsubscribe();
    clearTimeout(this.temporizador);
    this.map?.remove();
  }

  private crearMapa(lat: number, lng: number): void {
    this.map = L.map('mapa-elegir-casa', { zoomControl: false, attributionControl: true }).setView([lat, lng], 18);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    // Los eventos de Leaflet ocurren fuera de Angular: los regresamos a la zona para refrescar la vista
    this.map.on('movestart', () => this.zone.run(() => {
      this.moviendo = true;
      this.buscandoDireccion = true;
    }));
    this.map.on('moveend', () => this.zone.run(() => {
      this.moviendo = false;
      this.buscarDireccion();
    }));

    this.buscarDireccion();
  }

  /** Espera a que el usuario deje de mover el mapa y busca la dirección del centro. */
  private buscarDireccion(): void {
    if (!this.map) return;
    clearTimeout(this.temporizador);
    this.dirSub?.unsubscribe();
    this.buscandoDireccion = true;

    this.temporizador = setTimeout(() => {
      const c = this.map!.getCenter();
      this.dirSub = this.ubicacion.direccionDe(c.lat, c.lng).subscribe((dir) => {
        this.direccion = dir;
        this.buscandoDireccion = false;
      });
    }, 600);
  }

  async irAMiUbicacion(): Promise<void> {
    this.error = '';
    try {
      const pos = await this.ubicacion.obtenerPosicion();
      this.map?.flyTo([pos.lat, pos.lng], 18, { duration: 0.6 });
    } catch {
      this.error = 'No pudimos obtener tu ubicación. Revisa que el permiso de ubicación esté activado.';
    }
  }

  confirmar(): void {
    if (!this.map) return;
    const c = this.map.getCenter();
    this.guardando = true;
    this.error = '';

    this.ciudadanoService.guardarCasa(c.lat, c.lng, this.direccion).subscribe({
      next: () => this.router.navigate(['/ciudadano/mapa']),
      error: (err: any) => {
        this.guardando = false;
        this.error = err?.mensaje || 'No se pudo guardar tu ubicación. Intenta de nuevo.';
      }
    });
  }

  volver(): void {
    this.router.navigate(['/ciudadano/mapa']);
  }
}
