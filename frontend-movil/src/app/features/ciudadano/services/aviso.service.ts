import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AvisoCiudadanoService {
  constructor(private http: HttpClient) {}
  getAvisosPublicos() {
    // Ruta pública, no necesita token
    return this.http.get(`${environment.apiUrl}/v1/avisos/publicos`);
  }
}