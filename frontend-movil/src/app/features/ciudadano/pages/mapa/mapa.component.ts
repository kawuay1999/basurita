import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { GpsService, EstadoUbicacionCiudadano } from '../../services/gps.service';
import { CiudadanoService } from '../../services/ciudadano.service';
import { NotificacionPushService } from '../../services/notificacion-push.service';
import { AtrasService } from '../../../../core/services/atras.service';
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
  private map?: L.Map;
  private truckMarker?: L.Marker;
  private casaMarker?: L.Marker;
  private gpsSub?: Subscription;
  private primerCentrado = false;

  // Datos del perfil
  nombre = '';
  inicial = '?';
  correo = '';
  direccionCasa = '';
  private casa?: { lat: number; lng: number };

  // Estado del camión
  estadoCamion: 'pending' | 'active' | 'finished' = 'pending';
  tituloEstado = 'Buscando camiones cerca de tu casa...';
  mensajeTiempo = 'Consultando estado de ruta...';
  alertaConexion = '';

  menuAbierto = false;
  sinLeer = 0;
  private avisosSub?: Subscription;
  private quitarAtras?: () => void;

  constructor(
    private atras: AtrasService,
    private gpsService: GpsService,
    private ciudadanoService: CiudadanoService,
    private pushService: NotificacionPushService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Avisos del conductor y de proximidad (se revisan cada 15 s)
    this.pushService.vigilarAvisos();
    this.pushService.registrarPushNativo();
    // Botón regresar de Android: primero cierra el menú lateral
    this.quitarAtras = this.atras.registrar(() => {
      if (!this.menuAbierto) return false;
      this.menuAbierto = false;
      return true;
    });
    this.avisosSub = this.pushService.sinLeer$.subscribe((n) => (this.sinLeer = n));
    this.pintarPerfil(this.ciudadanoService.perfilLocal());

    // Refresca el perfil del servidor (por si cambió en otro dispositivo)
    this.ciudadanoService.getPerfil().subscribe({
      next: (perfil) => {
        if (perfil.latitud_casa == null || perfil.longitud_casa == null) {
          // Aún no elige su casa: lo mandamos a hacerlo
          this.router.navigate(['/ciudadano/elegir-casa']);
          return;
        }
        this.pintarPerfil(perfil);
        this.pintarCasa();
      }
    });

    this.iniciarTracking();
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.pintarCasa();
  }

  ngOnDestroy(): void {
    this.gpsSub?.unsubscribe();
    this.avisosSub?.unsubscribe();
    this.quitarAtras?.();
    this.map?.remove();
  }

  private pintarPerfil(perfil: any): void {
    this.nombre = perfil?.name || 'Ciudadano';
    this.inicial = this.nombre.trim().charAt(0).toUpperCase() || '?';
    this.correo = perfil?.email || '';
    this.direccionCasa = perfil?.direccion_casa || '';
    if (perfil?.latitud_casa != null && perfil?.longitud_casa != null) {
      this.casa = { lat: Number(perfil.latitud_casa), lng: Number(perfil.longitud_casa) };
    }
  }

  private initMap(): void {
    const centro = this.casa ?? { lat: 19.7128, lng: -98.9684 };
    this.map = L.map('mapa-contenedor', { zoomControl: false }).setView([centro.lat, centro.lng], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);
  }

  /** Marca la casa del ciudadano en el mapa. */
  private pintarCasa(): void {
    if (!this.map || !this.casa) return;

    const icono = L.divIcon({
      className: 'basurita-pin basurita-pin-home',
      html: `<svg viewBox="0 0 24 24" fill="white" class="w-5 h-5"><path d="M11.47 3.84a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.06l-8.69-8.69a2.25 2.25 0 0 0-3.18 0l-8.69 8.69a.75.75 0 1 0 1.06 1.06l8.69-8.69Z"/><path d="m12 5.43 8.16 8.16c.03.03.06.06.09.08v6.2c0 1.04-.84 1.88-1.88 1.88H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.63a1.88 1.88 0 0 1-1.88-1.88v-6.2l.09-.08L12 5.43Z"/></svg>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    if (this.casaMarker) {
      this.casaMarker.setLatLng([this.casa.lat, this.casa.lng]);
    } else {
      this.casaMarker = L.marker([this.casa.lat, this.casa.lng], { icon: icono, zIndexOffset: 500 })
        .bindTooltip('Tu casa')
        .addTo(this.map);
    }

    if (!this.primerCentrado) {
      this.map.setView([this.casa.lat, this.casa.lng], 16);
    }
  }

  centrarEnCasa(): void {
    if (this.casa) {
      this.map?.flyTo([this.casa.lat, this.casa.lng], 17, { duration: 0.6 });
    }
  }

  /** Consulta cada 10 s el camión en ruta más cercano a la casa. */
  private iniciarTracking(): void {
    this.gpsSub?.unsubscribe();

    this.gpsSub = this.gpsService.trackCamionCercano().subscribe((estado: EstadoUbicacionCiudadano) => {
      this.estadoCamion = estado.estado_ruta;
      this.mensajeTiempo = estado.mensaje_tiempo;
      this.alertaConexion = estado.mensaje_alerta;
      this.tituloEstado = estado.titulo ?? (estado.estado_ruta === 'active'
        ? 'El camión está cerca de tu casa'
        : 'El camión aún no pasa por tu zona');

      if (estado.tiene_ubicacion && estado.lat !== undefined && estado.lng !== undefined) {
        this.actualizarMarcador(estado.lat, estado.lng);
      } else if (this.truckMarker && this.map) {
        this.map.removeLayer(this.truckMarker);
        this.truckMarker = undefined;
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
      this.truckMarker = L.marker([lat, lng], { icon: truckIcon, zIndexOffset: 1000 }).addTo(this.map);

      // La primera vez, encuadra casa y camión juntos
      if (this.casa && !this.primerCentrado) {
        this.map.fitBounds(L.latLngBounds([[lat, lng], [this.casa.lat, this.casa.lng]]), { padding: [80, 80], maxZoom: 17 });
        this.primerCentrado = true;
      }
    } else {
      this.truckMarker.setLatLng([lat, lng]);
    }
  }

  cerrarSesion(): void {
    const salir = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.router.navigate(['/auth/login']);
    };
    this.authService.logout().subscribe({ complete: salir, error: salir });
  }
}
