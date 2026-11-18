import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { OperadorService } from '../../services/operador.service';

@Component({
  selector: 'app-operador-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  operadorNombre = '';
  enRuta = false;
  jornadaId: number | null = null;

  // Estado para alertas UI y cola offline
  mensajeAlerta = '';
  colaPendiente = 0;

  private gpsInterval: any;
  private pendientesSub?: Subscription;
  private currentLat = 0;
  private currentLng = 0;

  // Catálogo de incidencias rápidas
  incidencias = [
    { id: 'calle_cerrada', nombre: 'Calle Cerrada', color: 'bg-amber-700' },
    { id: 'falla_mecanica', nombre: 'Falla Mecánica', color: 'bg-red-700' },
    { id: 'accidente', nombre: 'Accidente', color: 'bg-purple-800' }
  ];

  constructor(private operadorService: OperadorService) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.operadorNombre = user.name || 'Operador';
    }

    // Recuperar jornada activa si existe en sesión local
    const jornadaGuardada = localStorage.getItem('jornada_activa_id');
    if (jornadaGuardada) {
      this.jornadaId = Number(jornadaGuardada);
    }

    // Escuchar en tiempo real cuántos registros esperan conexión
    this.pendientesSub = this.operadorService.pendientes$.subscribe((total) => {
      this.colaPendiente = total;
    });
  }

  ngOnDestroy(): void {
    this.detenerGps();
    if (this.pendientesSub) {
      this.pendientesSub.unsubscribe();
    }
  }

  toggleRuta(): void {
    this.enRuta = !this.enRuta;
    if (this.enRuta) {
      // Si aún no hay ID asignado desde el backend, usa 1 como respaldo de sesión
      if (!this.jornadaId) {
        this.jornadaId = Number(localStorage.getItem('jornada_activa_id')) || 1;
      }
      this.iniciarGps();
      this.mostrarAlerta('Ruta iniciada. Transmitiendo ubicación.');
    } else {
      this.detenerGps();
      this.mostrarAlerta('Ruta finalizada correctamente.');
    }
  }

  reportar(tipo: string): void {
    if (!this.enRuta || !this.jornadaId) return;

    this.operadorService.reportarIncidencia(this.jornadaId, tipo);
    this.mostrarAlerta(`Reporte enviado: ${tipo.replace('_', ' ')}`);
  }

  private iniciarGps(): void {
    if ('geolocation' in navigator) {
      this.gpsInterval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            this.currentLat = pos.coords.latitude;
            this.currentLng = pos.coords.longitude;
            if (this.jornadaId) {
              this.operadorService.enviarUbicacion(
                this.jornadaId,
                this.currentLat,
                this.currentLng,
                pos.coords.accuracy
              );
            }
          },
          () => {
            this.mostrarAlerta('No se pudo obtener la señal GPS del dispositivo.');
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }, 10000);
    }
  }

  private detenerGps(): void {
    if (this.gpsInterval) {
      clearInterval(this.gpsInterval);
    }
  }

  private mostrarAlerta(msg: string): void {
    this.mensajeAlerta = msg;
    setTimeout(() => (this.mensajeAlerta = ''), 4000);
  }
}