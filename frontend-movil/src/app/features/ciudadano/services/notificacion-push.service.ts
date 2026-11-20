import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject, Subscription, timer } from 'rxjs';
import { map, retry } from 'rxjs/operators';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { environment } from '../../../../environments/environment';

export interface AlertaVisual {
  titulo: string;
  mensaje: string;
  visible: boolean;
}

export interface Aviso {
  id: number;
  titulo: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
}

/**
 * Avisos para el ciudadano: los del conductor ("ya voy pasando", "voy con retraso")
 * y los automáticos cuando el camión se acerca a su casa.
 *
 * Mientras la app está abierta los consulta cada 15 s. En la APK, además, llegan
 * como notificación push (Firebase) aunque la app esté cerrada.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionPushService {
  private apiUrl = `${environment.apiUrl}/v1/ciudadano`;
  private readonly KEY_ULTIMO = 'basurita_ultimo_aviso_visto';
  private vigilancia?: Subscription;

  private alertaBannerSubject = new BehaviorSubject<AlertaVisual>({ titulo: '', mensaje: '', visible: false });
  public alertaBanner$ = this.alertaBannerSubject.asObservable();

  private sinLeerSubject = new BehaviorSubject<number>(0);
  public sinLeer$ = this.sinLeerSubject.asObservable();

  private pushRegistrado = false;

  /** Cada push que llega con la app abierta (la pantalla del conductor lo escucha). */
  private pushRecibido = new Subject<{ titulo: string; mensaje: string; tipo?: string }>();
  public pushRecibido$ = this.pushRecibido.asObservable();

  private esConductor(): boolean {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}').role === 'operador';
    } catch {
      return false;
    }
  }

  constructor(private http: HttpClient, private zone: NgZone, private router: Router) {}

  /**
   * Solo en la APK: pide permiso de notificaciones, registra el celular en Firebase
   * y manda su token al backend para que le lleguen los avisos con la app cerrada.
   */
  async registrarPushNativo(): Promise<void> {
    if (!Capacitor.isNativePlatform() || this.pushRegistrado) return;
    this.pushRegistrado = true;

    try {
      let permiso = await PushNotifications.checkPermissions();
      if (permiso.receive === 'prompt' || permiso.receive === 'prompt-with-rationale') {
        permiso = await PushNotifications.requestPermissions();
      }
      if (permiso.receive !== 'granted') return;

      // Canal de Android con prioridad alta: el aviso sale arriba de la pantalla, con sonido
      // y vibración, aunque la app esté cerrada (como las notificaciones de YouTube o WhatsApp)
      await PushNotifications.createChannel({
        id: 'avisos_camion',
        name: 'Avisos del camión',
        description: 'Cuando el camión está cerca de tu casa o el conductor manda un aviso',
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#16A34A'
      }).catch(() => {});

      await PushNotifications.addListener('registration', (t) => {
        this.http.post(`${environment.apiUrl}/v1/fcm-token`, { fcm_token: t.value })
          .pipe(retry({ count: 3, delay: () => timer(2000) }))
          .subscribe({ error: () => {} });
      });

      // Con la app abierta, Android no muestra la notificación: enseñamos el banner
      await PushNotifications.addListener('pushNotificationReceived', (n) => {
        this.zone.run(() => {
          this.pushRecibido.next({ titulo: n.title || 'Basurita', mensaje: n.body || '', tipo: n.data?.tipo });
          if (!this.esConductor()) {
            this.activarAlerta(n.title || 'Basurita', n.body || '');
            this.revisar();
          }
        });
      });

      // Al tocar la notificación: el ciudadano ve sus avisos, el conductor su ruta
      await PushNotifications.addListener('pushNotificationActionPerformed', () => {
        this.zone.run(() => this.router.navigate([this.esConductor() ? '/operador/dashboard' : '/ciudadano/avisos']));
      });

      await PushNotifications.register();
    } catch {
      this.pushRegistrado = false;
    }
  }

  /** Empieza a revisar avisos nuevos cada 15 s (solo una vez aunque se llame varias). */
  vigilarAvisos(): void {
    if (this.vigilancia) return;
    this.vigilancia = timer(0, 15000).subscribe(() => this.revisar());
  }

  detenerVigilancia(): void {
    this.vigilancia?.unsubscribe();
    this.vigilancia = undefined;
  }

  listar(): Observable<Aviso[]> {
    return this.http.get<any>(`${this.apiUrl}/notificaciones`).pipe(map((r) => r.data ?? []));
  }

  marcarLeida(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/notificaciones/${id}/leer`, {});
  }

  /** Recalcula el contador después de leer avisos en la pantalla de avisos. */
  actualizarContador(avisos: Aviso[]): void {
    this.sinLeerSubject.next(avisos.filter((a) => !a.leida).length);
  }

  /** Pide permiso para mostrar avisos del sistema (barra de notificaciones). */
  async pedirPermisoAvisos(): Promise<NotificationPermission | 'no_soportado'> {
    if (!('Notification' in window)) return 'no_soportado';
    return Notification.requestPermission();
  }

  permisoAvisos(): NotificationPermission | 'no_soportado' {
    return 'Notification' in window ? Notification.permission : 'no_soportado';
  }

  private revisar(): void {
    this.listar().subscribe({
      next: (avisos) => {
        this.actualizarContador(avisos);

        const ultimoVisto = Number(localStorage.getItem(this.KEY_ULTIMO) || 0);
        const nuevo = avisos.find((a) => !a.leida && a.id > ultimoVisto);
        const mayor = avisos.reduce((m, a) => Math.max(m, a.id), ultimoVisto);
        localStorage.setItem(this.KEY_ULTIMO, String(mayor));

        // La primera vez que abre la app no lo bombardeamos con avisos viejos
        if (nuevo && ultimoVisto > 0) {
          this.activarAlerta(nuevo.titulo, nuevo.mensaje);
        }
      },
      error: () => {}
    });
  }

  /** Banner visible + vibración + aviso del sistema si dio permiso. */
  activarAlerta(titulo: string, mensaje: string): void {
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 200, 500, 200, 800]);
    }

    this.alertaBannerSubject.next({ titulo, mensaje, visible: true });
    setTimeout(() => this.cerrarBanner(), 12000);

    if ('Notification' in window && Notification.permission === 'granted') {
      // En Android el aviso se muestra a través del service worker; si no hay, se intenta directo
      navigator.serviceWorker?.getRegistration?.()
        .then((reg) => {
          const opciones = { body: mensaje, icon: 'logo copy.ico' };
          if (reg) {
            reg.showNotification(titulo, opciones);
          } else {
            new Notification(titulo, opciones);
          }
        })
        .catch(() => {});
    }
  }

  cerrarBanner(): void {
    this.alertaBannerSubject.next({ titulo: '', mensaje: '', visible: false });
  }
}
