import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Aviso, NotificacionPushService } from '../../services/notificacion-push.service';

/** Lista de avisos recibidos: los del conductor y los de "el camión está cerca". */
@Component({
  selector: 'app-avisos-ciudadano',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-dvh bg-basurita-bg">
      <header class="bg-basurita-primary text-white px-4 pt-6 pb-16">
        <a routerLink="/ciudadano/mapa" aria-label="Regresar al mapa"
           class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-4">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/></svg>
        </a>
        <h1 class="text-2xl font-bold">Avisos del camión</h1>
        <p class="text-sm text-green-50">Lo que te manda el conductor y cuándo pasó cerca de tu casa</p>
      </header>

      <div class="px-4 -mt-10 pb-8 space-y-3">
        <div *ngIf="permiso === 'default'" class="bg-white rounded-softer shadow-soft p-4 flex items-center gap-3">
          <svg class="w-8 h-8 text-basurita-primary shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"/></svg>
          <p class="flex-1 text-sm text-basurita-text">Activa los avisos para enterarte aunque estés en otra pantalla.</p>
          <button (click)="activar()" class="px-3 py-2 rounded-soft bg-basurita-primary text-white text-sm font-bold active:scale-95">Activar</button>
        </div>

        <div *ngIf="cargando" class="bg-white rounded-softer shadow-soft p-6 text-center text-basurita-muted">Cargando avisos...</div>

        <div *ngIf="!cargando && error" class="bg-red-50 border border-red-100 rounded-softer p-5 text-sm text-basurita-danger-dark font-medium">{{ error }}</div>

        <div *ngIf="!cargando && !error && avisos.length === 0" class="bg-white rounded-softer shadow-soft p-8 text-center">
          <p class="font-bold text-basurita-text">Aún no tienes avisos</p>
          <p class="text-sm text-basurita-muted mt-1">Cuando el camión se acerque o el conductor mande un mensaje, aparecerá aquí.</p>
        </div>

        <div *ngFor="let a of avisos" class="bg-white rounded-softer shadow-soft p-4 flex gap-3"
             [ngClass]="a.leida ? '' : 'border-l-4 border-basurita-primary'">
          <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
               [ngClass]="a.leida ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-basurita-primary'">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <p class="font-bold text-basurita-text leading-tight">{{ a.titulo }}</p>
              <span class="text-xs text-basurita-muted shrink-0">{{ cuando(a.created_at) }}</span>
            </div>
            <p class="text-sm text-basurita-muted mt-1">{{ a.mensaje }}</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AvisosComponent implements OnInit {
  avisos: Aviso[] = [];
  cargando = true;
  error = '';
  permiso: string = 'no_soportado';

  constructor(private push: NotificacionPushService) {}

  ngOnInit(): void {
    this.permiso = this.push.permisoAvisos();
    this.push.listar().subscribe({
      next: (avisos) => {
        this.avisos = avisos;
        this.cargando = false;
        // Al abrir la pantalla se dan por leídos
        avisos.filter((a) => !a.leida).forEach((a) => this.push.marcarLeida(a.id).subscribe({ error: () => {} }));
        this.push.actualizarContador(avisos.map((a) => ({ ...a, leida: true })));
      },
      error: () => {
        this.cargando = false;
        this.error = 'No se pudieron cargar tus avisos. Revisa tu conexión.';
      }
    });
  }

  async activar(): Promise<void> {
    this.permiso = await this.push.pedirPermisoAvisos();
  }

  cuando(fecha: string): string {
    const d = new Date(fecha);
    const min = Math.round((Date.now() - d.getTime()) / 60000);
    if (min < 1) return 'Ahora';
    if (min < 60) return `Hace ${min} min`;
    if (min < 24 * 60) return `Hace ${Math.round(min / 60)} h`;
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }
}
