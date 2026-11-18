import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminIncidenciaService {
  private apiUrl = `${environment.apiUrl}/v1/admin/incidencias`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` }) };
  }

  getAll(): Observable<any> { return this.http.get(this.apiUrl, this.getAuthHeaders()); }
  updateEstado(id: number, estado: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/estado`, { estado }, this.getAuthHeaders());
  }
}