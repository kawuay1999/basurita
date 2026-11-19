import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UbicacionDispositivoService } from '../../../../core/services/ubicacion-dispositivo.service';
import { CiudadanoService } from '../../../ciudadano/services/ciudadano.service';

/**
 * Se muestra después de iniciar sesión.
 * - Si el permiso de ubicación ya está concedido, pasa directo (no vuelve a preguntar).
 * - Si no, explica por qué se necesita y al tocar "Permitir" el celular muestra su aviso nativo.
 */
@Component({
  selector: 'app-permiso-ubicacion',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="!revisando" class="min-h-screen bg-basurita-bg flex flex-col justify-between px-6 py-10">
      <div class="flex-1 flex flex-col items-center justify-center text-center">
        <div class="w-28 h-28 rounded-full bg-green-100 flex items-center justify-center mb-8">
          <svg class="w-14 h-14 text-basurita-primary" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/>
          </svg>
        </div>

        <h1 class="text-2xl font-bold text-basurita-text mb-3">Activa tu ubicación</h1>

        <p *ngIf="!esOperador" class="text-basurita-muted max-w-xs">
          Basurita usa tu ubicación para ubicar tu casa en el mapa y avisarte cuando el camión recolector esté cerca.
        </p>
        <p *ngIf="esOperador" class="text-basurita-muted max-w-xs">
          Basurita usa tu ubicación para mostrar el camión en tiempo real a los ciudadanos mientras estás en ruta.
        </p>

        <div *ngIf="estado === 'denied'" role="alert"
             class="mt-6 bg-amber-50 border border-amber-300 text-amber-950 rounded-soft p-4 text-sm text-left max-w-xs">
          <p class="font-bold mb-1">La ubicación está bloqueada</p>
          <p>Actívala desde el candado junto a la dirección del navegador → Permisos → Ubicación → Permitir. Luego toca "Intentar de nuevo".</p>
        </div>
      </div>

      <div class="space-y-3">
        <button (click)="permitir()" [disabled]="pidiendo"
                class="w-full py-4 rounded-soft bg-basurita-primary text-white font-bold text-lg shadow-soft active:scale-[0.98] transition disabled:opacity-60">
          {{ pidiendo ? 'Esperando respuesta...' : (estado === 'denied' ? 'Intentar de nuevo' : 'Permitir ubicación') }}
        </button>
        <button (click)="continuar()" class="w-full py-3 text-basurita-muted font-semibold">
          Ahora no
        </button>
      </div>
    </div>
  `
})
export class PermisoUbicacionComponent implements OnInit {
  revisando = true;
  pidiendo = false;
  estado: string = 'prompt';
  esOperador = false;

  constructor(
    private ubicacion: UbicacionDispositivoService,
    private authService: AuthService,
    private ciudadanoService: CiudadanoService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.esOperador = this.authService.getUserRole() === 'operador';
    this.estado = await this.ubicacion.estadoPermiso();

    // Ya lo había permitido antes: no se vuelve a preguntar
    if (this.estado === 'granted' || this.estado === 'no_soportado') {
      this.continuar();
      return;
    }
    this.revisando = false;
  }

  async permitir(): Promise<void> {
    this.pidiendo = true;
    try {
      // Aquí aparece el aviso nativo del celular
      await this.ubicacion.obtenerPosicion();
      this.continuar();
    } catch {
      this.estado = await this.ubicacion.estadoPermiso();
      // Si no lo negó (p. ej. tardó el GPS), igual dejamos continuar
      if (this.estado !== 'denied') {
        this.continuar();
      }
    } finally {
      this.pidiendo = false;
    }
  }

  /** Lleva a cada rol a su pantalla. Al ciudadano sin casa lo manda a elegirla. */
  continuar(): void {
    const rol = this.authService.getUserRole();

    if (rol === 'operador') {
      this.router.navigate(['/operador/dashboard']);
      return;
    }

    this.ciudadanoService.getPerfil().subscribe({
      next: (perfil) => {
        const tieneCasa = perfil.latitud_casa !== null && perfil.longitud_casa !== null;
        this.router.navigate([tieneCasa ? '/ciudadano/mapa' : '/ciudadano/elegir-casa']);
      },
      error: () => this.router.navigate(['/ciudadano/mapa'])
    });
  }
}
