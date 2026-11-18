import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MapaService {
  private apiUrl = `${environment.apiUrl}/v1/admin/mapa/ubicaciones`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders() {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${localStorage.getItem('token')}`
      })
    };
  }

  // Llama al servidor una vez
  getUbicacionesUnicaVez(): Observable<any> {
    return this.http.get(this.apiUrl, this.getAuthHeaders());
  }

  // Llama al servidor cada X milisegundos para simular tiempo real
  // En Angular te suscribes a esto y el mapa se actualiza solo
  getUbicacionesEnTiempoReal(intervaloMs: number = 10000): Observable<any> {
    return timer(0, intervaloMs).pipe(
      switchMap(() => this.http.get(this.apiUrl, this.getAuthHeaders()))
    );
  }
}