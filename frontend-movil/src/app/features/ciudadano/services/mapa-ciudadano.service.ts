import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MapaCiudadanoService {
  private apiUrl = `${environment.apiUrl}/v1/ciudadano/colonias`;

  constructor(private http: HttpClient) {}

  // Llama al servidor cada 15 segundos para refrescar la ubicación del camión
  // sin saturar los datos móviles del ciudadano
  getUbicacionesCamiones(coloniaId: number, intervaloMs: number = 15000): Observable<any> {
    return timer(0, intervaloMs).pipe(
      switchMap(() => this.http.get(`${this.apiUrl}/${coloniaId}/mapa`))
    );
  }
}