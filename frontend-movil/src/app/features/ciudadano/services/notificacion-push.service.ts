import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, timer } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface AlertaVisual {
  titulo: string;
  mensaje: string;
  visible: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificacionPushService {
  private apiUrl = `${environment.apiUrl}/v1/ciudadano`;
  
  // Banner visual accesible para personas con discapacidad auditiva
  private alertaBannerSubject = new BehaviorSubject<AlertaVisual>({
    titulo: '',
    mensaje: '',
    visible: false
  });
  public alertaBanner$ = this.alertaBannerSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Solicita permiso al navegador/dispositivo y registra el token con reintentos.
   */
  async inicializarNotificaciones(): Promise<void> {
    if (!('Notification' in window)) {
      return;
    }

    const permiso = await Notification.requestPermission();
    if (permiso === 'granted') {
      // Aquí se obtendría el token real de Capacitor PushNotifications o Firebase Web
      const tokenSimuladoOActual = localStorage.getItem('fcm_token') || 'token_dispositivo_' + Date.now();
      this.registrarTokenConReintentos(tokenSimuladoOActual);
    }
  }

  /**
   * Envía el token al backend con política de reintentos (3 intentos, espera de 2s).
   */
  private registrarTokenConReintentos(token: string): void {
    this.http.post(`${this.apiUrl}/fcm-token`, { fcm_token: token })
      .pipe(
        retry({ count: 3, delay: () => timer(2000) })
      )
      .subscribe({
        next: () => localStorage.setItem('fcm_token', token),
        error: () => {
          // Si falla tras 3 reintentos, se guarda pendiente para el próximo inicio
          localStorage.setItem('fcm_token_pendiente', token);
        }
      });
  }

  /**
   * Dispara alerta visual y vibración física (Accesibilidad).
   */
  activarAlertaProximidad(mensaje: string = 'El camión está cerca de tu colonia, saca tu basura'): void {
    // 1. Patrón de vibración fuerte (3 pulsos largos) para accesibilidad auditiva
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 200, 500, 200, 800]);
    }

    // 2. Mostrar banner visual de alto contraste
    this.alertaBannerSubject.next({
      titulo: 'Camión recolector cerca',
      mensaje: mensaje,
      visible: true
    });

    // 3. Notificación nativa del sistema si está en segundo plano
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Basurita', {
        body: mensaje,
        icon: 'assets/images/logo-basurita.svg'
      });
    }
  }

  cerrarBanner(): void {
    this.alertaBannerSubject.next({
      titulo: '',
      mensaje: '',
      visible: false
    });
  }
}