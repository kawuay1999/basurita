import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HistorialService } from '../../services/historial.service';

@Component({
  selector: 'app-historial-ciudadano',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './historial.component.html'
})
export class HistorialComponent implements OnInit {
  isLoading = true;
  errorMensaje = '';
  historial: any = null;

  constructor(private historialService: HistorialService) {}

  ngOnInit(): void {
    this.cargarHistorial();
  }

  /** El historial se calcula con la ubicación de la casa (ya no depende de la colonia). */
  cargarHistorial(): void {
    this.isLoading = true;
    this.errorMensaje = '';

    this.historialService.obtenerHistorial().subscribe({
      next: (res) => {
        this.isLoading = false;
        if (!res?.data) {
          this.errorMensaje = res?.mensaje || 'Elige la ubicación de tu casa para ver tu historial.';
          return;
        }
        this.historial = res.data;
      },
      error: () => {
        this.isLoading = false;
        this.errorMensaje = 'Sin conexión. No se pudo actualizar el historial de recolección.';
      }
    });
  }
}
