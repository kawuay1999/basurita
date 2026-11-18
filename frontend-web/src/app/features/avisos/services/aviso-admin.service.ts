import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AvisoAdminService {
  // Apunta exactamente al endpoint del grupo de administrador que configuramos en api.php
  private apiUrl = `${environment.apiUrl}/v1/admin/avisos`;

  constructor(private http: HttpClient) {}

  // Genera los headers con el token del administrador logueado
  private getAuthHeaders() {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${localStorage.getItem('token')}`
      })
    };
  }

  /**
   * Obtiene todos los avisos (activos e inactivos)
   */
  getAll(): Observable<any> {
    return this.http.get(this.apiUrl, this.getAuthHeaders());
  }

  /**
   * Crea un nuevo aviso oficial
   * @param data Objeto con titulo, mensaje, activo y fecha_expiracion
   */
  createAviso(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data, this.getAuthHeaders());
  }

  /**
   * Actualiza un aviso existente
   * @param id ID del aviso
   * @param data Datos a actualizar
   */
  updateAviso(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, this.getAuthHeaders());
  }

  /**
   * Elimina un aviso permanentemente
   * @param id ID del aviso a eliminar
   */
  deleteAviso(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, this.getAuthHeaders());
  }
}