import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
// Asegúrate de que el ButtonComponent esté copiado en tu frontend-web
import { ButtonComponent } from '../../../../shared/components/button/button.component'; 

@Component({
  selector: 'app-admin-camiones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent],
  template: `
    <div class="space-y-6">
      <!-- Encabezado y Acciones -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 class="text-2xl font-bold text-basurita-text">Catálogo de Camiones</h1>
        
        <div class="flex items-center gap-4 w-full sm:w-auto">
          <div class="relative w-full sm:w-72">
            <input type="text" [formControl]="searchControl" placeholder="Buscar placa o económico..." 
                   class="w-full bg-white border border-gray-200 rounded-full px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-basurita-primary">
            <svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          
          <app-button variant="primary" (onClick)="abrirModalNuevo()">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            Registrar
          </app-button>
        </div>
      </div>

      <!-- Tabla de Camiones -->
      <div class="bg-white rounded-softer shadow-soft border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100 text-sm uppercase text-gray-500 tracking-wider">
                <th class="p-4 font-semibold">No. Económico</th>
                <th class="p-4 font-semibold">Placas</th>
                <th class="p-4 font-semibold">Capacidad</th>
                <th class="p-4 font-semibold">Estado</th>
                <th class="p-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 text-sm text-basurita-text">
              <tr *ngFor="let camion of camiones" class="hover:bg-gray-50 transition-colors">
                <td class="p-4 font-bold">{{ camion.numero_economico }}</td>
                <td class="p-4">{{ camion.placas }}</td>
                <td class="p-4">{{ camion.capacidad }} Tons</td>
                <td class="p-4">
                  <span [ngClass]="camion.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'" 
                        class="px-3 py-1 rounded-full text-xs font-bold uppercase">
                    {{ camion.estado }}
                  </span>
                </td>
                <td class="p-4 text-right space-x-3">
                  <button class="text-blue-600 hover:text-blue-800 font-semibold">Editar</button>
                  <button class="text-red-600 hover:text-red-800 font-semibold">Baja</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class CamionesComponent implements OnInit {
  searchControl = new FormControl('');
  
  // Datos simulados para frontend (luego se conectan con AdminService)
  camiones = [
    { id: 1, numero_economico: 'ECO-104', placas: 'LZF-45-89', capacidad: 10, estado: 'activo' },
    { id: 2, numero_economico: 'ECO-099', placas: 'HJT-12-33', capacidad: 8, estado: 'inactivo' },
    { id: 3, numero_economico: 'ECO-112', placas: 'MNC-77-21', capacidad: 12, estado: 'activo' }
  ];

  ngOnInit() {}

  abrirModalNuevo() {
    alert('Aquí se abriría el modal para registrar un nuevo camión usando los inputs de tu Design System.');
  }
}