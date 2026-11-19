import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/**
 * Botón / gesto de "regresar" de Android.
 *
 * Sin esto, Android cierra la app en cuanto tocas regresar. Aquí:
 *  1. Si hay algo abierto (menú lateral, hoja de opciones), lo cierra.
 *  2. Si estás en una pantalla secundaria, te lleva a la anterior.
 *  3. Solo en las pantallas principales manda la app al fondo (como WhatsApp).
 */
@Injectable({ providedIn: 'root' })
export class AtrasService {
  private manejadores: Array<() => boolean> = [];
  private iniciado = false;

  // Pantalla → a dónde regresa
  private readonly anterior: Record<string, string> = {
    '/auth/register': '/auth/login',
    '/ciudadano/perfil': '/ciudadano/mapa',
    '/ciudadano/historial': '/ciudadano/mapa',
    '/ciudadano/acerca': '/ciudadano/mapa',
    '/ciudadano/avisos': '/ciudadano/mapa',
    '/operador/perfil': '/operador/dashboard',
    '/operador/acerca': '/operador/dashboard'
  };

  // Pantallas principales: regresar aquí manda la app al fondo
  private readonly principales = ['/auth/login', '/permiso-ubicacion', '/ciudadano/mapa', '/operador/dashboard'];

  constructor(private router: Router, private zone: NgZone) {}

  iniciar(): void {
    if (this.iniciado || !Capacitor.isNativePlatform()) return;
    this.iniciado = true;
    App.addListener('backButton', () => this.zone.run(() => this.regresar()));
  }

  /**
   * Una pantalla registra "si hay algo abierto, ciérralo y devuelve true".
   * Devuelve la función para quitarlo (llámala en ngOnDestroy).
   */
  registrar(manejador: () => boolean): () => void {
    this.manejadores.push(manejador);
    return () => (this.manejadores = this.manejadores.filter((m) => m !== manejador));
  }

  private regresar(): void {
    // 1. Algo abierto en la pantalla actual (el último registrado manda)
    for (let i = this.manejadores.length - 1; i >= 0; i--) {
      if (this.manejadores[i]()) return;
    }

    const ruta = this.router.url.split('?')[0];

    // 2. Pantalla secundaria conocida
    if (this.anterior[ruta]) {
      this.router.navigateByUrl(this.anterior[ruta]);
      return;
    }

    // Elegir casa: si ya tenía casa, regresa al mapa; si es la primera vez, no se puede saltar
    if (ruta === '/ciudadano/elegir-casa') {
      if (this.tieneCasa()) {
        this.router.navigateByUrl('/ciudadano/mapa');
      } else {
        App.minimizeApp();
      }
      return;
    }

    // 3. Pantalla principal: la app se va al fondo sin cerrarse
    if (this.principales.includes(ruta)) {
      App.minimizeApp();
      return;
    }

    window.history.length > 1 ? window.history.back() : App.minimizeApp();
  }

  private tieneCasa(): boolean {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.latitud_casa != null && u.longitud_casa != null;
    } catch {
      return false;
    }
  }
}
