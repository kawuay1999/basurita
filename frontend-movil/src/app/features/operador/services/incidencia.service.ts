import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IncidenciaService {
  private apiUrl = `${environment.apiUrl}/v1/operador/incidencias`;

  constructor(private http: HttpClient) {}

  reportarIncidencia(tipo: string, descripcion: string, foto?: File): Observable<any> {
    const formData = new FormData();
    formData.append('tipo', tipo);
    if (descripcion) formData.append('descripcion', descripcion);
    if (foto) formData.append('foto', foto);

    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`
      // IMPORTANTE: Al usar FormData, NO seteamos 'Content-Type', el navegador lo hace solo.
    });

    return this.http.post(this.apiUrl, formData, { headers });
  }
}