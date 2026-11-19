import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, of, fromEvent, merge } from 'rxjs';
import { switchMap, catchError, retry, tap, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface EstadoUbicacionCiudadano {
  tiene_ubicacion: boolean;
  lat?: number;
  lng?: number;
  sin_conexion: boolean;
  mensaje_alerta: string;
  mensaje_tiempo: string;
  titulo?: string;
  estado_ruta: 'pending' | 'active' | 'finished';
}

@Injectable({
  providedIn: 'root'
})
export class GpsService {
  private apiUrl = `${environment.apiUrl}/v1/ciudadano`;
  private readonly CACHE_KEY = 'basurita_ultima_ubicacion_camion';

  constructor(private http: HttpClient) {}

  /**
   * Cada 10 s consulta el camión en ruta más cercano a la casa del ciudadano.
   * Si no hay internet, muestra la última posición guardada en el celular.
   */
  trackCamionCercano(): Observable<EstadoUbicacionCiudadano> {
    const disparador = merge(timer(0, 10000), fromEvent(window, 'online'));

    return disparador.pipe(
      switchMap(() => {
        if (!navigator.onLine) {
          return of(this.obtenerDesdeCache());
        }

        return this.http.get<any>(`${this.apiUrl}/camion-cercano`).pipe(
          retry({ count: 2, delay: () => timer(1500) }),
          tap((res) => {
            if (res && typeof res.lat === 'number' && typeof res.lng === 'number') {
              localStorage.setItem(this.CACHE_KEY, JSON.stringify({ lat: res.lat, lng: res.lng, guardado_en: Date.now() }));
            }
          }),
          map((res): EstadoUbicacionCiudadano => {
            if (res && typeof res.lat === 'number' && typeof res.lng === 'number') {
              const distancia = this.formatearDistancia(res.distancia_metros);
              return {
                tiene_ubicacion: true,
                lat: res.lat,
                lng: res.lng,
                sin_conexion: false,
                // senal_perdida = el CAMIÓN lleva 2+ min sin reportar (el ciudadano sí tiene internet)
                mensaje_alerta: res.senal_perdida
                  ? 'El camión no ha enviado su ubicación recientemente. Mostrando la última conocida.'
                  : '',
                titulo: distancia ? `El camión está a ${distancia} de tu casa` : 'El camión está cerca de tu casa',
                mensaje_tiempo: [res.camion ? `Unidad ${res.camion}` : '', res.mensaje_tiempo || 'En vivo']
                  .filter(Boolean).join(' · '),
                estado_ruta: 'active'
              };
            }

            return {
              tiene_ubicacion: false,
              sin_conexion: false,
              mensaje_alerta: '',
              titulo: res?.estado_ruta === 'sin_casa' ? 'Falta la ubicación de tu casa' : 'El camión aún no pasa por tu zona',
              mensaje_tiempo: res?.mensaje || 'Te avisaremos cuando se acerque.',
              estado_ruta: 'pending'
            };
          }),
          catchError(() => of(this.obtenerDesdeCache()))
        );
      })
    );
  }

  private formatearDistancia(metros?: number): string {
    if (typeof metros !== 'number') return '';
    return metros < 1000 ? `${metros} m` : `${(metros / 1000).toFixed(1)} km`;
  }

  /**
   * Recupera la última ubicación real almacenada en el celular.
   * Nunca inventa coordenadas si no existe registro previo.
   */
  private obtenerDesdeCache(): EstadoUbicacionCiudadano {
    const sinDatos: EstadoUbicacionCiudadano = {
      tiene_ubicacion: false,
      sin_conexion: true,
      mensaje_alerta: 'Sin conexión a internet.',
      titulo: 'Sin conexión',
      mensaje_tiempo: 'Esperando conexión',
      estado_ruta: 'pending'
    };

    try {
      const guardado = JSON.parse(localStorage.getItem(this.CACHE_KEY) || 'null');
      if (!guardado) return sinDatos;
      const minutos = Math.max(1, Math.floor((Date.now() - guardado.guardado_en) / 60000));
      return {
        tiene_ubicacion: true,
        lat: guardado.lat,
        lng: guardado.lng,
        sin_conexion: true,
        mensaje_alerta: 'Sin conexión a internet. Mostrando la última ubicación guardada.',
        titulo: 'Última ubicación conocida del camión',
        mensaje_tiempo: `Última actualización: hace ${minutos} min`,
        estado_ruta: 'active'
      };
    } catch {
      return sinDatos;
    }
  }
}
