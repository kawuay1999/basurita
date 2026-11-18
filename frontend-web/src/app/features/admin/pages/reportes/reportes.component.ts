import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-admin-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.component.html'
})
export class ReportesComponent implements OnInit {
  private apiUrl = `${environment.apiUrl}/v1/admin/reportes`;

  // Filtros
  fechaInicio = '';
  fechaFin = '';
  busquedaTexto = '';

  isLoading = false;
  totales = {
    rutas_completadas: 0,
    total_jornadas: 0,
    total_incidencias: 0,
    total_retrasos: 0
  };
  registros: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarReporte();
  }

  cargarReporte(): void {
    this.isLoading = true;
    let params = new HttpParams();
    if (this.fechaInicio) params = params.set('fecha_inicio', this.fechaInicio);
    if (this.fechaFin) params = params.set('fecha_fin', this.fechaFin);

    this.http.get<any>(this.apiUrl, { params }).subscribe({
      next: (res) => {
        this.totales = res.totales || this.totales;
        this.registros = res.registros || [];
        this.isLoading = false;
      },
      error: () => {
        this.registros = [];
        this.isLoading = false;
      }
    });
  }

  get registrosFiltrados(): any[] {
    if (!this.busquedaTexto.trim()) return this.registros;
    const term = this.busquedaTexto.toLowerCase();
    return this.registros.filter(r =>
      r.ruta.toLowerCase().includes(term) ||
      r.camion.toLowerCase().includes(term) ||
      r.colonias.toLowerCase().includes(term)
    );
  }

  /**
   * Exporta los registros reales visibles a Excel (.xlsx)
   */
  exportarExcel(): void {
    const datosExcel = this.registrosFiltrados.map(r => ({
      'Fecha': r.fecha,
      'Ruta': r.ruta,
      'Camión': r.camion,
      'Placas': r.placa,
      'Colonias Cubiertas': r.colonias,
      'Estado': r.completada ? 'Completada' : r.estado,
      'Incidencias': r.total_incidencias,
      'Retraso': r.tuvo_retraso ? `Sí (${r.minutos_retraso} min)` : 'No'
    }));

    const hoja = XLSX.utils.json_to_sheet(datosExcel);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Reporte_Basurita');
    XLSX.writeFile(libro, `Reporte_Basurita_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  /**
   * Exporta los registros reales visibles a PDF institucional (.pdf)
   */
  exportarPdf(): void {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('BASURITA - Reporte Operativo de Recolección', 14, 18);
    
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-MX')} | Rutas completadas: ${this.totales.rutas_completadas} | Incidencias: ${this.totales.total_incidencias} | Retrasos: ${this.totales.total_retrasos}`, 14, 26);

    const filas = this.registrosFiltrados.map(r => [
      r.fecha,
      r.ruta,
      r.camion,
      r.colonias,
      r.completada ? 'Completada' : r.estado,
      r.total_incidencias.toString(),
      r.tuvo_retraso ? `${r.minutos_retraso} min` : 'A tiempo'
    ]);

    autoTable(doc, {
      startY: 32,
      head: [['Fecha', 'Ruta', 'Camión', 'Colonias', 'Estado', 'Incidencias', 'Puntualidad']],
      body: filas,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 136, 229] } // Primario Azul GPS #1E88E5
    });

    doc.save(`Reporte_Basurita_${new Date().toISOString().slice(0, 10)}.pdf`);
  }
}