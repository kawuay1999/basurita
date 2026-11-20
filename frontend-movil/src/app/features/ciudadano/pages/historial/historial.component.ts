import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HistorialService } from '../../services/historial.service';

interface Celda {
  dia: number | null;
  programado: boolean;
  atendido: boolean;
  hoy: boolean;
  pasado: boolean;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

@Component({
  selector: 'app-historial-ciudadano',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './historial.component.html'
})
export class HistorialComponent implements OnInit {
  pestana: 'calendario' | 'historial' = 'calendario';

  // Historial (hoy, ayer, últimos 7 días)
  isLoading = true;
  errorMensaje = '';
  historial: any = null;

  // Calendario del mes
  readonly diasSemana = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  anio = new Date().getFullYear();
  mes = new Date().getMonth() + 1; // 1-12
  calendario: any = null;
  celdas: Celda[] = [];
  cargandoCalendario = false;
  errorCalendario = '';
  proximo: { dia: number; mesCorto: string; texto: string } | null = null;

  constructor(private historialService: HistorialService) {}

  ngOnInit(): void {
    this.cargarHistorial();
    this.cargarCalendario();
  }

  get nombreMes(): string {
    return MESES[this.mes - 1];
  }

  cambiarMes(delta: number): void {
    this.mes += delta;
    if (this.mes < 1) { this.mes = 12; this.anio--; }
    if (this.mes > 12) { this.mes = 1; this.anio++; }
    this.cargarCalendario();
  }

  cargarCalendario(): void {
    this.cargandoCalendario = true;
    this.errorCalendario = '';
    this.armarCeldas([], []); // pinta el mes de inmediato, sin colores
    this.historialService.obtenerCalendario(this.anio, this.mes).subscribe({
      next: (res) => {
        this.cargandoCalendario = false;
        this.calendario = res?.data ?? null;
        this.armarCeldas(this.calendario?.dias_programados ?? [], this.calendario?.dias_atendidos ?? []);
        this.calcularProximo();
      },
      error: (err: any) => {
        this.cargandoCalendario = false;
        this.errorCalendario = err?.mensaje || 'No se pudo cargar el calendario.';
      }
    });
  }

  /** Arma la cuadrícula del mes empezando en lunes. */
  private armarCeldas(programados: number[], atendidos: number[]): void {
    const primero = new Date(this.anio, this.mes - 1, 1);
    const total = new Date(this.anio, this.mes, 0).getDate();
    const vaciasAlInicio = (primero.getDay() + 6) % 7; // lunes = 0
    const hoy = new Date();
    const esEsteMes = hoy.getFullYear() === this.anio && hoy.getMonth() + 1 === this.mes;
    const mesPasado = this.anio < hoy.getFullYear() || (this.anio === hoy.getFullYear() && this.mes < hoy.getMonth() + 1);

    const celdas: Celda[] = [];
    for (let i = 0; i < vaciasAlInicio; i++) {
      celdas.push({ dia: null, programado: false, atendido: false, hoy: false, pasado: false });
    }
    for (let d = 1; d <= total; d++) {
      celdas.push({
        dia: d,
        programado: programados.includes(d),
        atendido: atendidos.includes(d),
        hoy: esEsteMes && d === hoy.getDate(),
        pasado: mesPasado || (esEsteMes && d < hoy.getDate())
      });
    }
    this.celdas = celdas;
  }

  /** Próximo día programado desde hoy (en este mes). */
  private calcularProximo(): void {
    this.proximo = null;
    const hoy = new Date();
    const siguiente = this.celdas.find((c) => c.dia && c.programado && !c.pasado);
    const esEsteMes = hoy.getFullYear() === this.anio && hoy.getMonth() + 1 === this.mes;
    if (!siguiente?.dia || !esEsteMes) return;

    const fecha = new Date(this.anio, this.mes - 1, siguiente.dia);
    const texto = siguiente.hoy
      ? 'Hoy pasa el camión'
      : siguiente.dia === hoy.getDate() + 1
        ? `Mañana, ${DIAS_LARGOS[fecha.getDay()]}`
        : `${DIAS_LARGOS[fecha.getDay()].replace(/^./, (l) => l.toUpperCase())} ${siguiente.dia} de ${this.nombreMes}`;
    this.proximo = { dia: siguiente.dia, mesCorto: this.nombreMes.slice(0, 3), texto };
  }

  claseDia(c: Celda): string {
    if (c.programado && c.pasado) {
      // Día que tocaba y ya pasó: verde clarito (con palomita si sí pasó el camión)
      return 'bg-green-100 text-green-800' + (c.hoy ? ' ring-2 ring-basurita-secondary' : '');
    }
    if (c.programado) return 'bg-basurita-primary text-white shadow-sm' + (c.hoy ? ' ring-2 ring-offset-2 ring-basurita-secondary' : '');
    if (c.hoy) return 'ring-2 ring-basurita-secondary text-basurita-text';
    if (c.atendido) return 'bg-green-50 text-green-800';
    return c.pasado ? 'text-gray-400' : 'text-basurita-text';
  }

  etiquetaDia(c: Celda): string {
    const partes = [`${c.dia} de ${this.nombreMes}`];
    if (c.hoy) partes.push('hoy');
    if (c.programado) partes.push('día de recolección');
    if (c.atendido) partes.push('el camión pasó');
    return partes.join(', ');
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
