import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, of, fromEvent, merge } from 'rxjs';
import { switchMap, catchError, retry, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface EstadoUbicacionCiudadano {
  tiene_ubicacion: boolean;
  lat?: number;
  lng?: number;
  sin_conexion: boolean;
  mensaje_alerta: string;
  mensaje_tiempo: string;
  estado_ruta: 'pending' | 'active' | 'finished';
}

@Injectable({
  providedIn: 'root'
})
export class GpsService {
  private apiUrl = `${environment.apiUrl}/v1/gps`;

  constructor(private http: HttpClient) {}

  trackCamionColonia(coloniaId: number): Observable<EstadoUbicacionCiudadano> {
    const cacheKey = `basurita_ultima_ubicacion_colonia_${coloniaId}`;

    // Escuchar también cuando regrese el internet para consultar de inmediato
    const disparador = merge(
      timer(0, 10000),
      fromEvent(window, 'online')
    );

    return disparador.pipe(
      switchMap(() => {
        // Si el navegador sabe que no tiene red, ir directo a caché sin esperar timeout
        if (!navigator.onLine) {
          return of(this.obtenerDesdeCache(cacheKey));
        }

        return this.http.get<any>(`${this.apiUrl}/colonia/${coloniaId}/camion`).pipe(
          retry({ count: 2, delay: () => timer(1500) }),
          tap((res) => {
            // Guardar en local solo si el servidor devolvió coordenadas reales válidas
            if (res && typeof res.lat === 'number' && typeof res.lng === 'number') {
              localStorage.setItem(cacheKey, JSON.stringify({
                lat: res.lat,
                lng: res.lng,
                guardado_en: Date.now()
              }));
            }
          }),
          switchMap((res) => {
            if (res && typeof res.lat === 'number' && typeof res.lng === 'number') {
              return of({
                tiene_ubicacion: true,
                lat: res.lat,
                lng: res.lng,
                sin_conexion: Boolean(res.senal_perdida),
                mensaje_alerta: res.senal_perdida
                  ? 'Sin conexión. Mostrando última ubicación guardada.'
                  : '',
                mensaje_tiempo: res.mensaje_tiempo || 'En vivo',
                estado_ruta: 'active' as const
              });
            }

            // Si no hay ruta activa en el servidor
            return of({
              tiene_ubicacion: false,
              sin_conexion: false,
              mensaje_alerta: '',
              mensaje_tiempo: res?.mensaje || 'Aún no inicia el recorrido',
              estado_ruta: 'pending' as const
            });
          }),
          catchError(() => of(this.obtenerDesdeCache(cacheKey)))
        );
      })
    );
  }

  /**
   * Recupera la última ubicación real almacenada en localStorage.
   * Nunca inventa coordenadas si no existe registro previo.
   */
  private obtenerDesdeCache(cacheKey: string): EstadoUbicacionCiudadano {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) {
      return {
        tiene_ubicacion: false,
        sin_conexion: true,
        mensaje_alerta: 'Sin conexión. No hay ubicaciones previas guardadas.',
        mensaje_tiempo: 'Esperando conexión',
        estado_ruta: 'pending'
      };
    }

    try {
      const guardado = JSON.parse(raw);
      const minutos = Math.max(1, Math.floor((Date.now() - guardado.guardado_en) / 60000));

      return {
        tiene_ubicacion: true,
        lat: guardado.lat,
        lng: guardado.lng,
        sin_conexion: true,
        mensaje_alerta: 'Sin conexión. Mostrando última ubicación guardada.',
        mensaje_tiempo: `Última actualización: hace ${minutos} min`,
        estado_ruta: 'active'
      };
    } catch {
      return {
        tiene_ubicacion: false,
        sin_conexion: true,
        mensaje_alerta: 'Sin conexión. No hay ubicaciones previas guardadas.',
        mensaje_tiempo: 'Esperando conexión',
        estado_ruta: 'pending'
      };
    }
  }
}