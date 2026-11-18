import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class JornadaService {
  private apiUrl = `${environment.apiUrl}/v1/admin/jornadas`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` }) };
  }

  getAll(): Observable<any> { return this.http.get(this.apiUrl, this.getAuthHeaders()); }
  createJornada(data: any): Observable<any> { return this.http.post(this.apiUrl, data, this.getAuthHeaders()); }
  updateJornada(id: number, data: any): Observable<any> { return this.http.put(`${this.apiUrl}/${id}`, data, this.getAuthHeaders()); }
  deleteJornada(id: number): Observable<any> { return this.http.delete(`${this.apiUrl}/${id}`, this.getAuthHeaders()); }
}