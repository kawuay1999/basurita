import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HistorialService {
  private apiUrl = `${environment.apiUrl}/v1/ciudadano`;

  constructor(private http: HttpClient) {}

  /** Historial de los últimos 7 días calculado con la ubicación de la casa. */
  obtenerHistorial(): Observable<any> {
    return this.http.get(`${this.apiUrl}/historial`);
  }
}
