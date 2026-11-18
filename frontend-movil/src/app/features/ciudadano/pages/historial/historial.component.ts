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
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user && user.colonia_id) {
        this.cargarHistorial(user.colonia_id);
        return;
      }
    }
    this.isLoading = false;
    this.errorMensaje = 'No tienes una colonia asignada en tu perfil.';
  }

  cargarHistorial(coloniaId: number): void {
    this.isLoading = true;
    this.errorMensaje = '';

    this.historialService.obtenerHistorialColonia(coloniaId).subscribe({
      next: (res) => {
        this.historial = res.data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMensaje = 'Sin conexión. No se pudo actualizar el historial de recolección.';
      }
    });
  }
}