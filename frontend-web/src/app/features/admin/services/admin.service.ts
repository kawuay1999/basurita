import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/v1/admin`;

  constructor(private http: HttpClient) {}

  // Mapa Global: Obtiene la última posición de todos los camiones activos
  getUnidadesActivas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/monitoreo/activos`);
  }

  // Bandeja de Incidencias
  getIncidencias(estado?: string, busqueda?: string): Observable<any> {
    let params: any = {};
    if (estado && estado !== 'todas') params.estado = estado;
    if (busqueda) params.buscar = busqueda;
    return this.http.get(`${this.apiUrl}/incidencias`, { params });
  }

  actualizarEstadoIncidencia(id: number, estado: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/incidencias/${id}/estado`, { estado });
  }

  // --- Métodos base para los CRUDs (Camiones, Rutas, Colonias, Usuarios) ---
  // Ejemplo genérico para la estructura:
  // getCamiones() { return this.http.get(`${this.apiUrl}/camiones`); }
}