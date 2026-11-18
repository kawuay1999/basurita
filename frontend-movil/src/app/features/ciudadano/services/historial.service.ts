import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HistorialService {
  private apiUrl = `${environment.apiUrl}/v1/colonias`;

  constructor(private http: HttpClient) {}

  obtenerHistorialColonia(coloniaId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${coloniaId}/historial`);
  }
}