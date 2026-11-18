import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ColoniaService {
  private apiUrl = `${environment.apiUrl}/v1`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders() {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${localStorage.getItem('token')}`
      })
    };
  }

  // Para el Ciudadano (Móvil)
  getActivas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/colonias/activas`);
  }

  // Para el Admin (Web)
  getAllAdmin(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/colonias`, this.getAuthHeaders());
  }

  createColonia(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/colonias`, data, this.getAuthHeaders());
  }

  updateColonia(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/colonias/${id}`, data, this.getAuthHeaders());
  }

  deleteColonia(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/colonias/${id}`, this.getAuthHeaders());
  }
}