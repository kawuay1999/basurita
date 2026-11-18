import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificacionPushService, AlertaVisual } from '../../../features/ciudadano/services/notificacion-push.service';

@Component({
  selector: 'app-alerta-proximidad-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="alerta.visible" 
         role="alert"
         aria-live="assertive"
         class="fixed top-20 left-4 right-4 z-1050 bg-emerald-800 text-white p-5 rounded-softer shadow-floating border-2 border-white flex items-start gap-4 transition-all duration-300">
      
      <!-- Icono Lucide: Camión en movimiento -->
      <div class="bg-white/20 p-3 rounded-soft shrink-0">
        <svg class="w-7 h-7 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path d="M10 17h4V5H2v12h3"/>
          <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h2"/>
          <circle cx="7.5" cy="17.5" r="2.5"/>
          <circle cx="17.5" cy="17.5" r="2.5"/>
        </svg>
      </div>

      <!-- Mensaje -->
      <div class="flex-1">
        <h4 class="font-bold text-base tracking-tight">{{ alerta.titulo }}</h4>
        <p class="text-sm text-white/95 mt-1 font-medium leading-snug">
          {{ alerta.mensaje }}
        </p>
      </div>

      <!-- Botón cerrar -->
      <button (click)="cerrar()" 
              aria-label="Cerrar notificación"
              class="p-1.5 rounded-full hover:bg-white/20 transition-colors shrink-0">
        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `
})
export class AlertaProximidadBannerComponent implements OnInit {
  alerta: AlertaVisual = { titulo: '', mensaje: '', visible: false };

  constructor(private pushService: NotificacionPushService) {}

  ngOnInit(): void {
    this.pushService.alertaBanner$.subscribe(estado => {
      this.alerta = estado;
    });
  }

  cerrar(): void {
    this.pushService.cerrarBanner();
  }
}