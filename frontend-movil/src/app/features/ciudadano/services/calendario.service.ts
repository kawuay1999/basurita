    import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CalendarioService {
  private apiUrl = `${environment.apiUrl}/v1/ciudadano/colonias`;

  constructor(private http: HttpClient) {}

  // Consulta la rutina base sin importar la fecha
  getHorariosHabituales(coloniaId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${coloniaId}/horarios`);
  }

  // Consulta el calendario armado con fechas exactas y validación de festivos
  getCalendarioMensual(coloniaId: number, year: number, month: number): Observable<any> {
    const params = new HttpParams()
      .set('year', year.toString())
      .set('month', month.toString());

    return this.http.get(`${this.apiUrl}/${coloniaId}/calendario`, { params });
  }
}