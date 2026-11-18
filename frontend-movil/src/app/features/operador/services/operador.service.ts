import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, fromEvent, merge, interval } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface RegistroGpsOffline {
  client_uuid: string;
  jornada_id: number;
  latitud: number;
  longitud: number;
  precision_metros?: number;
  fecha_hora_dispositivo: string;
}

export interface RegistroIncidenciaOffline {
  client_uuid: string;
  jornada_id: number;
  tipo: string;
  descripcion?: string;
  fecha_hora_dispositivo: string;
}

@Injectable({
  providedIn: 'root'
})
export class OperadorService {
  private apiUrl = `${environment.apiUrl}/v1/operador`;
  private readonly KEY_GPS = 'basurita_cola_gps';
  private readonly KEY_INC = 'basurita_cola_incidencias';

  private isOnline = navigator.onLine;
  private isSyncing = false;

  // Estado reactivo para mostrar en la UI del operador
  private pendientesSubject = new BehaviorSubject<number>(0);
  public pendientes$ = this.pendientesSubject.asObservable();

  private conexionSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public conexion$ = this.conexionSubject.asObservable();

  constructor(private http: HttpClient) {
    this.actualizarContador();

    // 1. Escuchar eventos nativos de red del dispositivo
    merge(
      fromEvent(window, 'online'),
      fromEvent(window, 'offline')
    ).subscribe((event: Event) => {
      this.isOnline = event.type === 'online';
      this.conexionSubject.next(this.isOnline);

      if (this.isOnline) {
        this.sincronizarCola();
      }
    });

    // 2. Reintento periódico cada 20 segundos si hay señal y datos pendientes
    interval(20000).subscribe(() => {
      if (this.isOnline && this.getDatosEnColaCount() > 0) {
        this.sincronizarCola();
      }
    });
  }

  /**
   * Genera un UUID v4 único en el dispositivo para evitar duplicados al sincronizar.
   */
  private generarUuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // --- REGISTRO DE GPS ---
  enviarUbicacion(jornadaId: number, latitud: number, longitud: number, precisionMetros = 10): void {
    const registro: RegistroGpsOffline = {
      client_uuid: this.generarUuid(),
      jornada_id: jornadaId,
      latitud,
      longitud,
      precision_metros: precisionMetros,
      fecha_hora_dispositivo: new Date().toISOString()
    };

    if (!this.isOnline) {
      this.guardarEnCola(this.KEY_GPS, registro);
      return;
    }

    this.http.post(`${this.apiUrl}/gps`, registro).subscribe({
      next: () => {
        // Si hubo éxito y quedaban datos viejos en cola, aprovechar para sincronizar
        if (this.getDatosEnColaCount() > 0) {
          this.sincronizarCola();
        }
      },
      error: () => {
        // Si falla la petición por señal débil, guardar en cola local
        this.guardarEnCola(this.KEY_GPS, registro);
      }
    });
  }

  // --- REGISTRO DE INCIDENCIAS ---
  reportarIncidencia(jornadaId: number, tipo: string, descripcion?: string): void {
    const registro: RegistroIncidenciaOffline = {
      client_uuid: this.generarUuid(),
      jornada_id: jornadaId,
      tipo,
      descripcion,
      fecha_hora_dispositivo: new Date().toISOString()
    };

    if (!this.isOnline) {
      this.guardarEnCola(this.KEY_INC, registro);
      return;
    }

    this.http.post(`${this.apiUrl}/incidencias`, registro).subscribe({
      next: () => {
        if (this.getDatosEnColaCount() > 0) {
          this.sincronizarCola();
        }
      },
      error: () => {
        this.guardarEnCola(this.KEY_INC, registro);
      }
    });
  }

  // --- GESTIÓN DE COLA LOCAL ---
  private guardarEnCola(storageKey: string, item: any): void {
    const colaActual = this.obtenerCola(storageKey);
    // Verificar que no exista el mismo UUID en local
    if (!colaActual.some((x: any) => x.client_uuid === item.client_uuid)) {
      colaActual.push(item);
      localStorage.setItem(storageKey, JSON.stringify(colaActual));
      this.actualizarContador();
    }
  }

  private obtenerCola(storageKey: string): any[] {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {
      return [];
    }
  }

  getDatosEnColaCount(): number {
    return this.obtenerCola(this.KEY_GPS).length + this.obtenerCola(this.KEY_INC).length;
  }

  private actualizarContador(): void {
    this.pendientesSubject.next(this.getDatosEnColaCount());
  }

  // --- SINCRONIZACIÓN AUTOMÁTICA ---
  sincronizarCola(): void {
    if (this.isSyncing || !this.isOnline) {
      return;
    }

    const ubicaciones = this.obtenerCola(this.KEY_GPS);
    const incidencias = this.obtenerCola(this.KEY_INC);

    if (ubicaciones.length === 0 && incidencias.length === 0) {
      return;
    }

    this.isSyncing = true;

    this.http.post(`${this.apiUrl}/sincronizar`, { ubicaciones, incidencias }).subscribe({
      next: () => {
        // Eliminar únicamente los registros que fueron enviados en este lote
        this.limpiarSincronizados(this.KEY_GPS, ubicaciones.map(u => u.client_uuid));
        this.limpiarSincronizados(this.KEY_INC, incidencias.map(i => i.client_uuid));
        this.isSyncing = false;
        this.actualizarContador();
      },
      error: () => {
        // Mantener en cola para el siguiente reintento sin perder datos
        this.isSyncing = false;
      }
    });
  }

  private limpiarSincronizados(storageKey: string, uuidsEnviados: string[]): void {
    const restantes = this.obtenerCola(storageKey).filter(
      (item: any) => !uuidsEnviados.includes(item.client_uuid)
    );
    localStorage.setItem(storageKey, JSON.stringify(restantes));
  }
}