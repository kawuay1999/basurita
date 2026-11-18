import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-incidencias',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 class="text-2xl font-bold text-basurita-text">Bandeja de Incidencias</h1>
        
        <!-- Búsqueda -->
        <div class="relative w-full sm:w-72">
          <input type="text" [formControl]="searchControl" placeholder="Buscar por unidad o ruta..." 
                 class="w-full bg-white border border-gray-200 rounded-full px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-basurita-primary">
          <svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
      </div>

      <!-- Filtros (Tabs) -->
      <div class="flex space-x-2 border-b border-gray-200">
        <button *ngFor="let tab of tabs" 
                (click)="cambiarFiltro(tab.value)"
                [ngClass]="filtroActivo === tab.value ? 'border-basurita-primary text-basurita-primary font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'"
                class="px-4 py-3 border-b-2 transition-colors">
          {{ tab.label }}
        </button>
      </div>

      <!-- Tabla Moderna -->
      <div class="bg-white rounded-softer shadow-soft border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100 text-sm uppercase text-gray-500 tracking-wider">
                <th class="p-4 font-semibold">Fecha</th>
                <th class="p-4 font-semibold">Tipo</th>
                <th class="p-4 font-semibold">Unidad / Ruta</th>
                <th class="p-4 font-semibold">Estado</th>
                <th class="p-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 text-sm text-basurita-text">
              <tr *ngFor="let inc of incidencias" class="hover:bg-gray-50 transition-colors">
                <td class="p-4">{{ inc.created_at | date:'short' }}</td>
                <td class="p-4 font-medium">{{ inc.tipo | uppercase }}</td>
                <td class="p-4">
                  <p class="font-bold">{{ inc.camion.numero_economico }}</p>
                  <p class="text-xs text-gray-500">{{ inc.ruta.nombre }}</p>
                </td>
                <td class="p-4">
                  <span [ngClass]="{
                    'bg-orange-100 text-orange-800': inc.estado === 'nueva',
                    'bg-blue-100 text-blue-800': inc.estado === 'en_atencion',
                    'bg-green-100 text-green-800': inc.estado === 'resuelta'
                  }" class="px-3 py-1 rounded-full text-xs font-bold uppercase">
                    {{ inc.estado.replace('_', ' ') }}
                  </span>
                </td>
                <td class="p-4 text-right space-x-2">
                  <button *ngIf="inc.estado === 'nueva'" (click)="actualizarEstado(inc.id, 'en_atencion')" class="text-blue-600 hover:text-blue-800 font-semibold">Atender</button>
                  <button *ngIf="inc.estado === 'en_atencion'" (click)="actualizarEstado(inc.id, 'resuelta')" class="text-green-600 hover:text-green-800 font-semibold">Resolver</button>
                </td>
              </tr>
              <tr *ngIf="incidencias.length === 0">
                <td colspan="5" class="p-8 text-center text-gray-500">No se encontraron incidencias.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class IncidenciasComponent implements OnInit {
  tabs = [
    { label: 'Todas', value: 'todas' },
    { label: 'Nuevas', value: 'nueva' },
    { label: 'En Atención', value: 'en_atencion' },
    { label: 'Resueltas', value: 'resuelta' }
  ];
  filtroActivo = 'todas';
  searchControl = new FormControl('');
  
  incidencias: any[] = []; // Se llenará con adminService.getIncidencias()

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.cargarDatos();
    this.searchControl.valueChanges.subscribe(() => this.cargarDatos());
  }

  cambiarFiltro(estado: string) {
    this.filtroActivo = estado;
    this.cargarDatos();
  }

  cargarDatos() {
    const busqueda = this.searchControl.value || '';
    this.adminService.getIncidencias(this.filtroActivo, busqueda).subscribe({
      next: (res: any) => this.incidencias = res.data || [],
      error: () => {
        // Datos simulados para probar la UI si el backend no responde
        this.incidencias = [
          { id: 1, tipo: 'falla_mecanica', estado: 'nueva', created_at: new Date(), camion: { numero_economico: 'ECO-104' }, ruta: { nombre: 'Ruta Centro' } },
          { id: 2, tipo: 'calle_cerrada', estado: 'en_atencion', created_at: new Date(), camion: { numero_economico: 'ECO-099' }, ruta: { nombre: 'Ruta Sur' } }
        ];
      }
    });
  }

  actualizarEstado(id: number, nuevoEstado: string) {
    this.adminService.actualizarEstadoIncidencia(id, nuevoEstado).subscribe({
      next: () => this.cargarDatos(),
      error: () => {
        // Simulación UI
        const inc = this.incidencias.find(i => i.id === id);
        if(inc) inc.estado = nuevoEstado;
      }
    });
  }
}