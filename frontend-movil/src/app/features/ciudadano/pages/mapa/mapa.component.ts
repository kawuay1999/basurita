import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GpsService, EstadoUbicacionCiudadano } from '../../services/gps.service';
import { NotificacionPushService } from '../../services/notificacion-push.service';
import { StatusCardComponent } from '../../../../shared/components/status-card/status-card.component';
import { AlertaProximidadBannerComponent } from '../../../../shared/components/alerta-proximidad-banner/alerta-proximidad-banner.component';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-mapa-ciudadano',
  standalone: true,
  imports: [CommonModule, RouterModule, StatusCardComponent, AlertaProximidadBannerComponent],
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.css']
})
export class MapaComponent implements OnInit, AfterViewInit, OnDestroy {
  private map!: L.Map;
  private truckMarker?: L.Marker;
  private gpsSub?: Subscription;

  ubicacionSeleccionada: 'Casa' | 'Trabajo' = 'Casa';
  coloniaCasaId = 1;
  coloniaTrabajoId = 2;

  estadoCamion: 'pending' | 'active' | 'finished' = 'pending';
  mensajeTiempo = 'Consultando estado de ruta...';
  alertaConexion = '';

  constructor(
    private gpsService: GpsService,
    private pushService: NotificacionPushService
  ) {}

  ngOnInit(): void {
    this.pushService.inicializarNotificaciones();

    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user?.colonia_id) {
        this.coloniaCasaId = Number(user.colonia_id);
      }
      if (user?.colonia_trabajo_id) {
        this.coloniaTrabajoId = Number(user.colonia_trabajo_id);
      }
    }

    // Paso 1 automático al abrir: rastrea colonia Casa por defecto
    this.iniciarTracking(this.coloniaCasaId);
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.gpsSub) this.gpsSub.unsubscribe();
    if (this.map) this.map.remove();
  }

  private initMap(): void {
    this.map = L.map('mapa-contenedor', {
      zoomControl: false
    }).setView([19.7128, -98.9684], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);
  }

  private iniciarTracking(coloniaId: number): void {
    // Evitar suscripciones duplicadas al cambiar entre Casa y Trabajo
    if (this.gpsSub) {
      this.gpsSub.unsubscribe();
    }

    // Limpiar marcador anterior al cambiar de zona
    if (this.truckMarker && this.map) {
      this.map.removeLayer(this.truckMarker);
      this.truckMarker = undefined;
    }

    this.gpsSub = this.gpsService.trackCamionColonia(coloniaId).subscribe((estado: EstadoUbicacionCiudadano) => {
      this.estadoCamion = estado.estado_ruta;
      this.mensajeTiempo = estado.mensaje_tiempo;
      this.alertaConexion = estado.sin_conexion ? estado.mensaje_alerta : '';

      if (estado.tiene_ubicacion && estado.lat !== undefined && estado.lng !== undefined) {
        this.actualizarMarcador(estado.lat, estado.lng);
      }
    });
  }

  private actualizarMarcador(lat: number, lng: number): void {
    if (!this.map) return;

    if (!this.truckMarker) {
      const truckIcon = L.divIcon({
        className: 'basurita-pin basurita-pin-truck',
        html: `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" class="w-6 h-6"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`,
        iconSize: [48, 48],
        iconAnchor: [24, 48]
      });

      this.truckMarker = L.marker([lat, lng], { icon: truckIcon }).addTo(this.map);
      this.map.setView([lat, lng], 16);
    } else {
      this.truckMarker.setLatLng([lat, lng]);
    }
  }

  // Paso 2 (1 toque): Cambiar entre Casa y Trabajo -> Paso 3: Ver estado inmediato
  cambiarUbicacion(lugar: 'Casa' | 'Trabajo'): void {
    if (this.ubicacionSeleccionada === lugar) return;
    this.ubicacionSeleccionada = lugar;
    const coloniaDestino = lugar === 'Casa' ? this.coloniaCasaId : this.coloniaTrabajoId;
    this.iniciarTracking(coloniaDestino);
  }
}