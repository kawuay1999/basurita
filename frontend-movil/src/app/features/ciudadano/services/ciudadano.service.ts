import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PerfilCiudadano {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  latitud_casa: number | null;
  longitud_casa: number | null;
  direccion_casa: string | null;
  radio_notificacion_metros: number | null;
}

@Injectable({ providedIn: 'root' })
export class CiudadanoService {
  private apiUrl = `${environment.apiUrl}/v1/ciudadano`;

  constructor(private http: HttpClient) {}

  getPerfil(): Observable<PerfilCiudadano> {
    return this.http.get<any>(`${environment.apiUrl}/v1/perfil`).pipe(
      map((res) => res.data),
      tap((perfil) => this.guardarLocal(perfil))
    );
  }

  actualizarPerfil(datos: { name: string; phone: string }): Observable<PerfilCiudadano> {
    return this.http.put<any>(`${environment.apiUrl}/v1/perfil`, datos).pipe(
      map((res) => res.data),
      tap((perfil) => this.guardarLocal(perfil))
    );
  }

  guardarCasa(lat: number, lng: number, direccion: string): Observable<PerfilCiudadano> {
    return this.http.put<any>(`${this.apiUrl}/casa`, { lat, lng, direccion }).pipe(
      map((res) => res.data),
      tap((perfil) => this.guardarLocal(perfil))
    );
  }

  camionCercano(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/camion-cercano`);
  }

  /** Perfil guardado en el celular (para pintar rápido sin esperar al servidor). */
  perfilLocal(): Partial<PerfilCiudadano> {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }

  private guardarLocal(perfil: PerfilCiudadano): void {
    const actual = this.perfilLocal();
    localStorage.setItem('user', JSON.stringify({ ...actual, ...perfil }));
  }
}
