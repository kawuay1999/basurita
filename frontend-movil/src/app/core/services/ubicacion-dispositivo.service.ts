import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

export type EstadoPermiso = 'granted' | 'denied' | 'prompt' | 'no_soportado';

export interface Coordenadas {
  lat: number;
  lng: number;
  precision?: number;
}

/**
 * Todo lo relacionado con el GPS del celular:
 * permiso, posición actual, seguimiento en vivo y dirección legible.
 */
@Injectable({ providedIn: 'root' })
export class UbicacionDispositivoService {
  // Centro por defecto (Tecámac) si no hay GPS disponible
  readonly CENTRO_DEFECTO: Coordenadas = { lat: 19.7128, lng: -98.9684 };

  constructor(private http: HttpClient) {}

  /** Consulta el estado del permiso sin mostrar ningún aviso al usuario. */
  async estadoPermiso(): Promise<EstadoPermiso> {
    if (!('geolocation' in navigator)) {
      return 'no_soportado';
    }
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return status.state as EstadoPermiso;
    } catch {
      // Algunos navegadores no soportan permissions.query: asumimos que hay que preguntar
      return 'prompt';
    }
  }

  /**
   * Pide la posición actual. Si el permiso no se ha dado,
   * aquí es donde el celular muestra el aviso "¿Permitir ubicación?".
   */
  obtenerPosicion(): Promise<Coordenadas> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('no_soportado'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, precision: pos.coords.accuracy }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  }

  /** Sigue la posición en tiempo real. Devuelve una función para detener el seguimiento. */
  seguirPosicion(onPos: (c: Coordenadas) => void, onError?: (e: GeolocationPositionError) => void): () => void {
    if (!('geolocation' in navigator)) {
      return () => {};
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => onPos({ lat: pos.coords.latitude, lng: pos.coords.longitude, precision: pos.coords.accuracy }),
      (err) => onError?.(err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }

  /**
   * Convierte coordenadas en una dirección legible ("Calle Jaspe 12, Tecámac").
   * Usa OpenStreetMap (Nominatim), gratuito y sin llave. Cuando se use Google Maps,
   * solo hay que cambiar esta función por la de Google Geocoding.
   */
  direccionDe(lat: number, lng: number): Observable<string> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es&zoom=18&addressdetails=1`;
    return this.http.get<any>(url).pipe(
      map((res) => this.formatearDireccion(res)),
      catchError(() => of(`${lat.toFixed(5)}, ${lng.toFixed(5)}`))
    );
  }

  private formatearDireccion(res: any): string {
    const a = res?.address ?? {};
    const calle = [a.road || a.pedestrian || a.footway, a.house_number].filter(Boolean).join(' ');
    const colonia = a.neighbourhood || a.suburb || a.quarter || a.residential;
    const ciudad = a.city || a.town || a.village || a.municipality;
    const partes = [calle, colonia, ciudad].filter(Boolean);
    return partes.length ? partes.join(', ') : (res?.display_name ?? 'Ubicación seleccionada');
  }
}
