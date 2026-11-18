import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GpsService {
  private apiUrl = `${environment.apiUrl}/v1/operador/gps`;
  private intervalId: any;

  constructor(private http: HttpClient) {}

  // Lógica principal: Inicia la lectura del GPS del teléfono
  startTracking() {
    if (navigator.geolocation) {
      // Configuramos para enviar la ubicación cada 15 segundos (15000 ms)
      this.intervalId = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => this.sendPositionToServer(position),
          (error) => console.error('Error GPS', error),
          { enableHighAccuracy: true, maximumAge: 0 }
        );
      }, 15000);
    } else {
      console.error('Geolocalización no soportada');
    }
  }

  stopTracking() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private sendPositionToServer(position: GeolocationPosition) {
    const data = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date(position.timestamp).toISOString() // Enviar fecha UTC estándar
    };

    const headers = new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` });
    
    this.http.post(this.apiUrl, data, { headers }).subscribe({
      next: () => console.log('Ubicación enviada'),
      error: (err) => console.error('Error al enviar ubicación', err)
    });
  }
}