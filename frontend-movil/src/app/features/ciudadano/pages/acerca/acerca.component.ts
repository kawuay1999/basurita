import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-acerca',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-dvh bg-basurita-bg">
      <header class="bg-basurita-primary text-white px-4 pt-6 pb-16">
        <a [routerLink]="esConductor ? '/operador/dashboard' : '/ciudadano/mapa'" aria-label="Regresar"
           class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-4">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/></svg>
        </a>
        <h1 class="text-2xl font-bold">Acerca de Basurita</h1>
      </header>

      <div class="px-4 -mt-10 pb-8 space-y-4">
        <div class="bg-white rounded-softer shadow-soft p-6 text-center">
          <img src="logo copy.ico" alt="Logo de Basurita" class="h-16 mx-auto mb-3">
          <p class="font-bold text-lg text-basurita-text">Basurita</p>
          <p class="text-sm text-basurita-muted">Tu basura a tiempo, tu ciudad limpia y conectada.</p>
          <p class="text-xs text-basurita-muted mt-2">Versión 1.0 (prueba)</p>
        </div>

        <div class="bg-white rounded-softer shadow-soft p-5 space-y-4 text-sm text-basurita-text">
          <ng-container *ngIf="!esConductor">
            <div>
              <p class="font-bold mb-1">¿Qué hace?</p>
              <p class="text-basurita-muted">Te muestra en el mapa dónde va el camión recolector y te avisa cuando está cerca de tu casa, para que saques tu basura a tiempo.</p>
            </div>
            <div>
              <p class="font-bold mb-1">Tu ubicación</p>
              <p class="text-basurita-muted">Solo guardamos la ubicación de tu casa que tú eliges en el mapa. La usamos para calcular qué tan cerca está el camión. Puedes cambiarla cuando quieras.</p>
            </div>
          </ng-container>
          <ng-container *ngIf="esConductor">
            <div>
              <p class="font-bold mb-1">¿Qué hace?</p>
              <p class="text-basurita-muted">Te muestra la ruta que te asignó el municipio, te guía por el recorrido y avisa a los vecinos cuando vas pasando por su calle.</p>
            </div>
            <div>
              <p class="font-bold mb-1">Tu ubicación</p>
              <p class="text-basurita-muted">Tu ubicación solo se comparte mientras tienes una ruta iniciada. Al terminar la ruta se deja de enviar.</p>
            </div>
          </ng-container>
          <div>
            <p class="font-bold mb-1">Mapas</p>
            <p class="text-basurita-muted">Mapas y direcciones © colaboradores de OpenStreetMap.</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AcercaComponent {
  esConductor = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}').role === 'operador';
    } catch {
      return false;
    }
  })();
}
