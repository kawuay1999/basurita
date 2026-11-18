import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificacionService {
  private apiUrl = `${environment.apiUrl}/v1/ciudadano/notificaciones`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` }) };
  }

  getHistorial(): Observable<any> {
    return this.http.get(this.apiUrl, this.getAuthHeaders());
  }

  marcarComoLeida(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/leer`, {}, this.getAuthHeaders());
  }
}