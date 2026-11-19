import { Component, OnInit, OnDestroy, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Router, RouterModule } from '@angular/router';
import * as L from 'leaflet';
import { OperadorService } from '../../services/operador.service';
import { AuthService } from '../../../auth/services/auth.service';
import { UbicacionDispositivoService, Coordenadas } from '../../../../core/services/ubicacion-dispositivo.service';
import { environment } from '../../../../../environments/environment';
import { NotificacionPushService } from '../../../ciudadano/services/notificacion-push.service';
import { AtrasService } from '../../../../core/services/atras.service';

type Punto = [number, number];
type Hoja = 'avisos' | 'reportar' | 'terminar' | null;

/**
 * Pantalla del conductor, estilo DiDi / Uber:
 * mapa a pantalla completa con el recorrido asignado, flecha que sigue al camión,
 * calle actual arriba y acciones grandes abajo (iniciar, avisar vecinos, reportar, terminar).
 */
@Component({
  selector: 'app-operador-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  // Perfil
  nombre = '';
  correo = '';
  inicial = '?';
  menuAbierto = false;

  // Jornada de hoy
  cargando = true;
  procesando = false;
  jornadaId: number | null = null;
  enRuta = false;
  rutaNombre = '';
  camionNumero = '';
  camionPlaca = '';
  colonias: string[] = [];
  recorrido: Punto[] = [];
  kmTotales = 0;

  // Avance sobre el recorrido
  porcentaje = 0;
  kmRestantes = 0;
  calleActual = '';
  zonaActual = '';

  // GPS
  estadoGps: 'buscando' | 'ok' | 'sin_permiso' = 'buscando';
  siguiendo = true;
  colaPendiente = 0;

  // UI
  hoja: Hoja = null;
  mensaje = '';
  mensajeError = false;
  readonly modoPrueba = environment.modoPrueba;
  simulando = false;

  readonly avisos = [
    { tipo: 'pasando', titulo: 'Ya voy pasando', detalle: 'A los vecinos a menos de 600 m', icono: 'camion' },
    { tipo: 'en_camino', titulo: 'Ya inicié el recorrido', detalle: 'A todos los vecinos de la ruta', icono: 'ruta' },
    { tipo: 'retraso', titulo: 'Voy con retraso', detalle: 'A todos los vecinos de la ruta', icono: 'reloj' },
    { tipo: 'no_pasara', titulo: 'Hoy no podré pasar', detalle: 'A todos los vecinos de la ruta', icono: 'alto' }
  ];

  readonly incidencias = [
    { id: 'calle_cerrada', nombre: 'Calle cerrada', color: 'bg-amber-600' },
    { id: 'falla_mecanica', nombre: 'Falla mecánica', color: 'bg-red-700' },
    { id: 'accidente', nombre: 'Accidente', color: 'bg-purple-800' }
  ];

  private map?: L.Map;
  private flecha?: L.Marker;
  private lineaRestante?: L.Polyline;
  private lineaRecorrida?: L.Polyline;
  private bordeRuta?: L.Polyline;
  private marcadoresRuta: L.Marker[] = [];
  private acumulado: number[] = [];
  private avanceMetros = 0;

  private posicion?: Coordenadas;
  private anterior?: Coordenadas;
  private rumbo = 0;
  private ultimaCalle?: { lat: number; lng: number; t: number };

  private detenerSeguimiento?: () => void;
  private envioInterval: any;
  private simulacion: any;
  private pendientesSub?: Subscription;
  private mensajeTimer: any;
  private pushSub?: Subscription;
  private revisionInterval: any;
  private quitarAtras?: () => void;

  constructor(
    private push: NotificacionPushService,
    private atras: AtrasService,
    private operadorService: OperadorService,
    private authService: AuthService,
    private ubicacion: UbicacionDispositivoService,
    private router: Router,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      this.nombre = user.name || 'Conductor';
      this.correo = user.email || '';
    } catch {
      this.nombre = 'Conductor';
    }
    this.inicial = this.nombre.trim().charAt(0).toUpperCase() || '?';

    this.pendientesSub = this.operadorService.pendientes$.subscribe((n) => (this.colaPendiente = n));

    // Avisos push (APK): cuando el admin le asigna una ruta, se recarga sola
    this.push.registrarPushNativo();
    this.pushSub = this.push.pushRecibido$.subscribe((p) => {
      this.avisar(p.mensaje ? `${p.titulo}: ${p.mensaje}` : p.titulo);
      if (p.tipo === 'nueva_ruta' && !this.enRuta) this.cargarJornada();
    });

    // Sin push (o en el navegador): si no tiene ruta, revisa cada 30 s por si el admin le asigna una
    this.revisionInterval = setInterval(() => {
      if (!this.jornadaId && !this.cargando) this.cargarJornada(true);
    }, 30000);

    // Botón regresar de Android: primero cierra hojas y menú
    this.quitarAtras = this.atras.registrar(() => {
      if (this.hoja) { this.hoja = null; return true; }
      if (this.menuAbierto) { this.menuAbierto = false; return true; }
      return false;
    });
  }

  ngAfterViewInit(): void {
    this.crearMapa();
    this.cargarJornada();
    this.iniciarGps();
  }

  ngOnDestroy(): void {
    this.detenerEnvio();
    this.detenerSimulacion();
    this.detenerSeguimiento?.();
    this.pendientesSub?.unsubscribe();
    this.pushSub?.unsubscribe();
    clearInterval(this.revisionInterval);
    this.quitarAtras?.();
    clearTimeout(this.mensajeTimer);
    this.map?.remove();
  }

  get primerNombre(): string {
    return this.nombre.split(' ')[0];
  }

  // ================= Jornada =================

  /** @param silencioso revisión automática: sin "Consultando..." ni errores en pantalla */
  cargarJornada(silencioso = false): void {
    if (!silencioso) this.cargando = true;
    this.operadorService.getJornadaHoy().subscribe({
      next: (res: any) => {
        const j = res?.data;
        this.cargando = false;
        if (!j) {
          if (silencioso) return;
          this.jornadaId = null;
          this.enRuta = false;
          this.pintarRecorrido([]);
          return;
        }
        if (silencioso) this.avisar('¡Tienes una nueva ruta asignada!');
        this.jornadaId = j.id;
        this.rutaNombre = j.ruta?.nombre ?? 'Ruta sin nombre';
        this.camionNumero = j.camion?.numero_economico ?? '';
        this.camionPlaca = j.camion?.placa ?? '';
        this.colonias = (j.ruta?.colonias ?? []).map((c: any) => c.nombre);
        this.enRuta = j.estado === 'en_curso';
        this.pintarRecorrido(Array.isArray(j.ruta?.recorrido) ? j.ruta.recorrido : []);
        if (this.enRuta) {
          this.siguiendo = true;
          this.iniciarEnvio();
          if (this.posicion) this.usarPosicion(this.posicion);
        }
      },
      error: (err: any) => {
        this.cargando = false;
        if (!silencioso) this.avisar(err?.mensaje || 'No se pudo consultar tu ruta de hoy.', true);
      }
    });
  }

  iniciarRuta(): void {
    if (!this.jornadaId || this.procesando) return;
    this.procesando = true;
    this.operadorService.iniciarRuta().subscribe({
      next: () => {
        this.procesando = false;
        this.enRuta = true;
        this.siguiendo = true;
        this.avanceMetros = 0;
        this.iniciarEnvio();
        if (this.posicion) this.usarPosicion(this.posicion);
        this.avisar('¡Buen viaje! Tu ubicación ya se comparte con los vecinos.');
        // Avisa a los vecinos de la ruta que el camión ya salió
        this.operadorService.avisarVecinos('en_camino').subscribe({ error: () => {} });
      },
      error: (err: any) => {
        this.procesando = false;
        this.avisar(err?.mensaje || 'No se pudo iniciar la ruta. Intenta de nuevo.', true);
      }
    });
  }

  terminarRuta(): void {
    if (this.procesando) return;
    this.procesando = true;
    this.operadorService.finalizarRuta().subscribe({
      next: () => {
        this.procesando = false;
        this.hoja = null;
        this.detenerEnvio();
        this.detenerSimulacion();
        this.enRuta = false;
        this.jornadaId = null;
        this.pintarRecorrido([]);
        this.avisar('Ruta terminada. Dejamos de compartir tu ubicación.');
      },
      error: (err: any) => {
        this.procesando = false;
        this.avisar(err?.mensaje || 'No se pudo terminar la ruta. Intenta de nuevo.', true);
      }
    });
  }

  avisarVecinos(tipo: string): void {
    if (this.procesando) return;
    this.procesando = true;
    this.operadorService.avisarVecinos(tipo).subscribe({
      next: (res: any) => {
        this.procesando = false;
        this.hoja = null;
        this.avisar(res?.message || 'Aviso enviado.');
      },
      error: (err: any) => {
        this.procesando = false;
        this.hoja = null;
        this.avisar(err?.mensaje || 'No se pudo enviar el aviso.', true);
      }
    });
  }

  reportar(tipo: string, nombre: string): void {
    if (!this.enRuta || !this.jornadaId) return;
    this.operadorService.reportarIncidencia(this.jornadaId, tipo);
    this.hoja = null;
    this.avisar(`Reporte enviado: ${nombre}. El administrador ya lo puede ver.`);
  }

  // ================= Mapa =================

  private crearMapa(): void {
    const c = this.ubicacion.CENTRO_DEFECTO;
    this.map = L.map('mapa-operador', { zoomControl: false, attributionControl: false }).setView([c.lat, c.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this.map);

    // Si el conductor mueve el mapa con el dedo, dejamos de seguirlo hasta que toque "Centrar"
    this.map.on('dragstart', () => this.zone.run(() => (this.siguiendo = false)));
  }

  recentrar(): void {
    this.siguiendo = true;
    if (this.posicion) {
      this.map?.setView([this.posicion.lat, this.posicion.lng], this.enRuta ? 17 : 16, { animate: true });
    } else if (this.lineaRestante) {
      this.map?.fitBounds(this.lineaRestante.getBounds(), { padding: [40, 40] });
    }
  }

  private pintarRecorrido(puntos: Punto[]): void {
    if (!this.map) return;
    [this.lineaRestante, this.lineaRecorrida, this.bordeRuta].forEach((l) => l?.remove());
    this.marcadoresRuta.forEach((m) => m.remove());
    this.marcadoresRuta = [];
    this.lineaRestante = this.lineaRecorrida = this.bordeRuta = undefined;

    this.recorrido = puntos.filter((p) => Array.isArray(p) && p.length === 2).map((p) => [Number(p[0]), Number(p[1])] as Punto);
    this.acumulado = [0];
    for (let i = 1; i < this.recorrido.length; i++) {
      this.acumulado.push(this.acumulado[i - 1] + this.distancia(this.recorrido[i - 1], this.recorrido[i]));
    }
    const total = this.acumulado[this.acumulado.length - 1] || 0;
    this.kmTotales = Math.round(total / 100) / 10;
    this.kmRestantes = this.kmTotales;
    this.porcentaje = 0;

    if (this.recorrido.length < 2) return;

    // Borde blanco + línea verde (lo que falta) + línea gris (lo ya recorrido)
    this.bordeRuta = L.polyline(this.recorrido, { color: '#ffffff', weight: 11, opacity: 0.9 }).addTo(this.map);
    this.lineaRecorrida = L.polyline([], { color: '#94A3B8', weight: 7, opacity: 0.9 }).addTo(this.map);
    this.lineaRestante = L.polyline(this.recorrido, { color: '#16A34A', weight: 7 }).addTo(this.map);

    const pin = (clase: string, p: Punto, titulo: string) =>
      L.marker(p, {
        icon: L.divIcon({ className: clase, iconSize: [18, 18], iconAnchor: [9, 9] }),
        title: titulo,
        keyboard: false
      }).addTo(this.map!);
    this.marcadoresRuta.push(pin('basurita-pin-inicio', this.recorrido[0], 'Inicio del recorrido'));
    this.marcadoresRuta.push(pin('basurita-pin-fin', this.recorrido[this.recorrido.length - 1], 'Fin del recorrido'));

    // Muestra toda la ruta mientras no esté en ruta o mientras llega la señal GPS
    if (!this.enRuta || !this.posicion) {
      this.map.fitBounds(this.lineaRestante.getBounds(), { padding: [40, 40] });
    }
  }

  // ================= GPS =================

  private iniciarGps(): void {
    this.detenerSeguimiento = this.ubicacion.seguirPosicion(
      (pos) => this.zone.run(() => {
        this.estadoGps = 'ok';
        if (!this.simulando) this.usarPosicion(pos);
      }),
      (err) => this.zone.run(() => {
        this.estadoGps = err.code === err.PERMISSION_DENIED ? 'sin_permiso' : 'buscando';
      })
    );
  }

  /** Recibe cada posición nueva (real o simulada) y actualiza mapa, avance y calle. */
  private usarPosicion(pos: Coordenadas): void {
    if (this.anterior && this.distancia([this.anterior.lat, this.anterior.lng], [pos.lat, pos.lng]) > 3) {
      this.rumbo = this.calcularRumbo(this.anterior, pos);
    }
    this.anterior = pos;
    this.posicion = pos;

    this.pintarFlecha(pos);
    if (this.enRuta) {
      this.actualizarAvance(pos);
      this.actualizarCalle(pos);
    }

    if (this.siguiendo && this.map) {
      if (this.enRuta) {
        this.map.setView([pos.lat, pos.lng], Math.max(this.map.getZoom(), 17), { animate: true });
      } else if (this.recorrido.length < 2) {
        this.map.setView([pos.lat, pos.lng], 16, { animate: true });
      }
    }
  }

  private pintarFlecha(pos: Coordenadas): void {
    if (!this.map) return;
    if (!this.flecha) {
      const icono = L.divIcon({
        className: 'basurita-pin-nav',
        html: `<div class="nav-flecha"><svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M12 2 4.5 20.3l.7.7L12 18l6.8 3 .7-.7z"/></svg></div>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      });
      this.flecha = L.marker([pos.lat, pos.lng], { icon: icono, zIndexOffset: 1000, keyboard: false }).addTo(this.map);
    } else {
      this.flecha.setLatLng([pos.lat, pos.lng]);
    }
    const el = this.flecha.getElement()?.querySelector('.nav-flecha') as HTMLElement | null;
    if (el) el.style.transform = `rotate(${this.rumbo}deg)`;
  }

  /** Proyecta la posición sobre el recorrido para saber cuánto lleva y pintar lo recorrido en gris. */
  private actualizarAvance(pos: Coordenadas): void {
    if (this.recorrido.length < 2 || !this.lineaRestante || !this.lineaRecorrida) return;

    let mejor = { dist: Infinity, along: 0, punto: this.recorrido[0], i: 0 };
    for (let i = 0; i < this.recorrido.length - 1; i++) {
      const r = this.proyectar([pos.lat, pos.lng], this.recorrido[i], this.recorrido[i + 1]);
      const along = this.acumulado[i] + r.t * (this.acumulado[i + 1] - this.acumulado[i]);
      // Solo cuenta si está pegado a la ruta y no "salta" a un tramo muy adelante
      if (r.dist < mejor.dist && along <= this.avanceMetros + 400) {
        mejor = { dist: r.dist, along, punto: r.punto, i };
      }
    }
    if (mejor.dist > 60 || mejor.along < this.avanceMetros) return;

    this.avanceMetros = mejor.along;
    const total = this.acumulado[this.acumulado.length - 1];
    this.porcentaje = Math.min(100, Math.round((this.avanceMetros / total) * 100));
    this.kmRestantes = Math.max(0, Math.round((total - this.avanceMetros) / 100) / 10);

    const hecho = [...this.recorrido.slice(0, mejor.i + 1), mejor.punto];
    const falta = [mejor.punto, ...this.recorrido.slice(mejor.i + 1)];
    this.lineaRecorrida.setLatLngs(hecho);
    this.lineaRestante.setLatLngs(falta);
  }

  /** Nombre de la calle actual (se consulta como máximo cada 8 s y cada 40 m). */
  private actualizarCalle(pos: Coordenadas): void {
    const ahora = Date.now();
    if (this.ultimaCalle) {
      const movido = this.distancia([this.ultimaCalle.lat, this.ultimaCalle.lng], [pos.lat, pos.lng]);
      if (movido < 40 || ahora - this.ultimaCalle.t < 8000) return;
    }
    this.ultimaCalle = { lat: pos.lat, lng: pos.lng, t: ahora };
    this.ubicacion.direccionDe(pos.lat, pos.lng).subscribe((dir) => {
      const partes = dir.split(',').map((s) => s.trim());
      this.calleActual = partes[0] || dir;
      this.zonaActual = partes.slice(1, 3).join(', ');
    });
  }

  /** Mientras está en ruta, manda la última posición al servidor cada 10 s. */
  private iniciarEnvio(): void {
    if (this.envioInterval) return;
    const enviar = () => {
      if (this.enRuta && this.jornadaId && this.posicion) {
        this.operadorService.enviarUbicacion(this.jornadaId, this.posicion.lat, this.posicion.lng, this.posicion.precision);
      }
    };
    enviar();
    this.envioInterval = setInterval(enviar, 10000);
  }

  private detenerEnvio(): void {
    clearInterval(this.envioInterval);
    this.envioInterval = null;
  }

  // ================= Modo prueba (solo en desarrollo) =================

  /** Mueve el camión por el recorrido para probar sin salir a la calle. */
  simularRecorrido(): void {
    if (this.simulando) {
      this.detenerSimulacion();
      return;
    }
    if (this.recorrido.length < 2) return;
    this.simulando = true;
    this.siguiendo = true;
    const pasoMetros = 25;
    let metros = this.avanceMetros;
    const total = this.acumulado[this.acumulado.length - 1];

    this.simulacion = setInterval(() => this.zone.run(() => {
      metros = Math.min(total, metros + pasoMetros);
      const i = Math.max(0, this.acumulado.findIndex((a) => a >= metros) - 1);
      const tramo = this.acumulado[i + 1] - this.acumulado[i] || 1;
      const t = (metros - this.acumulado[i]) / tramo;
      const a = this.recorrido[i];
      const b = this.recorrido[i + 1] ?? a;
      this.usarPosicion({ lat: a[0] + (b[0] - a[0]) * t, lng: a[1] + (b[1] - a[1]) * t, precision: 5 });
      if (metros >= total) this.detenerSimulacion();
    }), 1500);
  }

  private detenerSimulacion(): void {
    clearInterval(this.simulacion);
    this.simulacion = null;
    this.simulando = false;
  }

  // ================= Sesión =================

  cerrarSesion(): void {
    this.detenerEnvio();
    this.detenerSimulacion();
    this.authService.logout().subscribe({ complete: () => this.salir(), error: () => this.salir() });
  }

  private salir(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/auth/login']);
  }

  private avisar(msg: string, error = false): void {
    this.mensaje = msg;
    this.mensajeError = error;
    clearTimeout(this.mensajeTimer);
    this.mensajeTimer = setTimeout(() => (this.mensaje = ''), 4500);
  }

  // ================= Geometría =================

  private distancia(a: Punto, b: Punto): number {
    const r = 6371000;
    const dLat = ((b[0] - a[0]) * Math.PI) / 180;
    const dLng = ((b[1] - a[1]) * Math.PI) / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  /** Punto más cercano de p sobre el segmento a-b (proyección plana local). */
  private proyectar(p: Punto, a: Punto, b: Punto): { dist: number; t: number; punto: Punto } {
    const mLat = 111320;
    const mLng = 111320 * Math.cos((p[0] * Math.PI) / 180);
    const ax = (a[1] - p[1]) * mLng, ay = (a[0] - p[0]) * mLat;
    const bx = (b[1] - p[1]) * mLng, by = (b[0] - p[0]) * mLat;
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    const t = l2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
    const px = ax + t * dx, py = ay + t * dy;
    return { dist: Math.sqrt(px * px + py * py), t, punto: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] };
  }

  private calcularRumbo(a: Coordenadas, b: Coordenadas): number {
    const φ1 = (a.lat * Math.PI) / 180, φ2 = (b.lat * Math.PI) / 180;
    const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }
}
