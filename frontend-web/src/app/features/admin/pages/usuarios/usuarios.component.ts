import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, debounceTime } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { CalendarioAdminComponent } from './calendario-admin.component';

const PATRON_CORREO = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

/** Usuarios de la app (ciudadanos) + calendario de recolección que ven en su app. */
@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarioAdminComponent],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 class="text-2xl font-bold text-basurita-text">Usuarios</h1>
          <p class="text-sm text-basurita-muted">Ciudadanos registrados en la app y el calendario de recolección que ven.</p>
        </div>
        <div class="bg-white rounded-full p-1 shadow-soft border border-gray-100 flex" role="tablist">
          <button role="tab" [attr.aria-selected]="pestana === 'ciudadanos'" (click)="pestana = 'ciudadanos'"
                  class="px-4 py-2 rounded-full text-sm font-semibold transition"
                  [ngClass]="pestana === 'ciudadanos' ? 'bg-basurita-primary text-white' : 'text-basurita-muted hover:text-basurita-text'">
            Ciudadanos <span class="ml-1 opacity-80">{{ total }}</span>
          </button>
          <button role="tab" [attr.aria-selected]="pestana === 'calendario'" (click)="pestana = 'calendario'"
                  class="px-4 py-2 rounded-full text-sm font-semibold transition"
                  [ngClass]="pestana === 'calendario' ? 'bg-basurita-primary text-white' : 'text-basurita-muted hover:text-basurita-text'">
            Calendario de recolección
          </button>
        </div>
      </div>

      <app-calendario-admin *ngIf="pestana === 'calendario'"></app-calendario-admin>

      <ng-container *ngIf="pestana === 'ciudadanos'">
        <div class="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div class="relative w-full sm:w-80">
            <input type="search" [(ngModel)]="buscar" (ngModelChange)="buscar$.next($event)" placeholder="Buscar por nombre, correo o teléfono"
                   class="w-full bg-white border border-gray-200 rounded-full px-4 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-basurita-primary">
            <svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <button (click)="abrirNuevo()" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-soft bg-basurita-primary text-white font-semibold shadow-soft hover:bg-basurita-primary-dark">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14m7-7H5"/></svg>
            Nuevo ciudadano
          </button>
        </div>

        <div *ngIf="aviso" role="status" class="p-3 rounded-soft text-sm font-semibold"
             [ngClass]="avisoError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'">{{ aviso }}</div>

        <div class="bg-white rounded-softer shadow-soft border border-gray-100 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 tracking-wider">
                  <th class="p-4 font-semibold">Ciudadano</th>
                  <th class="p-4 font-semibold">Teléfono</th>
                  <th class="p-4 font-semibold">Casa</th>
                  <th class="p-4 font-semibold">Alta</th>
                  <th class="p-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 text-sm text-basurita-text">
                <tr *ngIf="cargando"><td colspan="5" class="p-6 text-center text-basurita-muted">Cargando ciudadanos...</td></tr>
                <tr *ngIf="!cargando && usuarios.length === 0">
                  <td colspan="5" class="p-6 text-center text-basurita-muted">{{ buscar ? 'Nadie coincide con la búsqueda.' : 'Aún no hay ciudadanos registrados.' }}</td>
                </tr>
                <tr *ngFor="let u of usuarios" class="hover:bg-gray-50">
                  <td class="p-4">
                    <div class="flex items-center gap-3">
                      <span class="w-9 h-9 rounded-full bg-basurita-secondary text-white font-bold flex items-center justify-center shrink-0">{{ (u.name || '?').charAt(0).toUpperCase() }}</span>
                      <div class="min-w-0">
                        <p class="font-semibold truncate">{{ u.name }}</p>
                        <p class="text-xs text-basurita-muted truncate">{{ u.email }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="p-4 tabular-nums">{{ u.phone || '—' }}</td>
                  <td class="p-4 max-w-56">
                    <span *ngIf="u.tiene_casa" class="block truncate" [title]="u.direccion_casa">{{ u.direccion_casa || 'Ubicación guardada' }}</span>
                    <span *ngIf="!u.tiene_casa" class="text-amber-700 text-xs font-semibold">Sin casa elegida</span>
                  </td>
                  <td class="p-4 text-basurita-muted whitespace-nowrap">{{ u.created_at | date:'dd/MM/yyyy' }}</td>
                  <td class="p-4 text-right space-x-3 whitespace-nowrap">
                    <button (click)="abrirEditar(u)" class="text-basurita-primary-dark hover:underline font-semibold">Editar</button>
                    <button (click)="eliminar(u)" class="text-red-600 hover:underline font-semibold">Eliminar</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>
    </div>

    <!-- Modal crear / editar -->
    <div *ngIf="modalAbierto" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40" (click)="modalAbierto = false"></div>
      <form (ngSubmit)="guardar()" role="dialog" aria-modal="true" novalidate
            class="relative bg-white rounded-softer shadow-floating w-full max-w-md p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        <h2 class="text-xl font-bold text-basurita-text">{{ editando ? 'Editar ciudadano' : 'Nuevo ciudadano' }}</h2>

        <div>
          <label class="block text-sm font-medium mb-1" for="u-name">Nombre completo</label>
          <input id="u-name" name="name" [(ngModel)]="form.name" class="input-base" placeholder="Ej. Juan Pérez López">
          <p *ngIf="intento && errores['name']" class="text-xs text-red-600 font-semibold mt-1">{{ errores['name'] }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" for="u-email">Correo (con este inicia sesión)</label>
          <input id="u-email" name="email" type="email" [(ngModel)]="form.email" class="input-base" placeholder="juan@gmail.com" autocapitalize="none">
          <p *ngIf="intento && errores['email']" class="text-xs text-red-600 font-semibold mt-1">{{ errores['email'] }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" for="u-phone">Teléfono (10 dígitos)</label>
          <input id="u-phone" name="phone" type="tel" inputmode="numeric" maxlength="10" [(ngModel)]="form.phone"
                 (ngModelChange)="form.phone = soloDigitos($event)" class="input-base" placeholder="5512345678">
          <p *ngIf="intento && errores['phone']" class="text-xs text-red-600 font-semibold mt-1">{{ errores['phone'] }}</p>
        </div>

        <div class="pt-1">
          <label class="block text-sm font-medium mb-1" for="u-pass">
            {{ editando ? 'Nueva contraseña' : 'Contraseña' }}
            <span *ngIf="editando" class="text-basurita-muted font-normal">(déjala vacía para no cambiarla)</span>
          </label>
          <div class="relative">
            <input id="u-pass" name="password" [type]="verPassword ? 'text' : 'password'" [(ngModel)]="form.password"
                   class="input-base pr-12" placeholder="Ej. Basurita2026" autocomplete="new-password">
            <button type="button" (click)="verPassword = !verPassword" [attr.aria-label]="verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path *ngIf="!verPassword" stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                <path *ngIf="verPassword" stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"/>
              </svg>
            </button>
          </div>
          <ul *ngIf="!editando || form.password" class="mt-2 grid grid-cols-2 gap-1 text-xs">
            <li *ngFor="let r of requisitos" class="flex items-center gap-1.5 font-medium"
                [ngClass]="r.ok ? 'text-basurita-primary' : (intento ? 'text-red-600' : 'text-basurita-muted')">
              {{ r.ok ? '✓' : '○' }} {{ r.texto }}
            </li>
          </ul>
          <p *ngIf="editando && form.password" class="text-xs text-amber-700 mt-2">Al cambiarla, se le cerrará la sesión en su celular.</p>
        </div>

        <p *ngIf="errorForm" class="text-sm text-red-700 font-semibold">{{ errorForm }}</p>

        <div class="flex justify-end gap-3 pt-2">
          <button type="button" (click)="modalAbierto = false" class="px-4 py-2.5 rounded-soft border border-gray-300 font-semibold">Cancelar</button>
          <button type="submit" [disabled]="guardando" class="px-4 py-2.5 rounded-soft bg-basurita-primary text-white font-semibold disabled:opacity-60">
            {{ guardando ? 'Guardando...' : (editando ? 'Guardar cambios' : 'Crear ciudadano') }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class UsuariosComponent implements OnInit {
  pestana: 'ciudadanos' | 'calendario' = 'ciudadanos';
  usuarios: any[] = [];
  total = 0;
  cargando = true;
  buscar = '';
  buscar$ = new Subject<string>();
  aviso = '';
  avisoError = false;

  modalAbierto = false;
  editando: any = null;
  form = { name: '', email: '', phone: '', password: '' };
  verPassword = false;
  intento = false;
  guardando = false;
  errorForm = '';

  private api = `${environment.apiUrl}/v1/admin/usuarios`;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargar();
    this.buscar$.pipe(debounceTime(300)).subscribe(() => this.cargar());
  }

  cargar(): void {
    this.cargando = true;
    this.http.get<any>(this.api, { params: this.buscar ? { buscar: this.buscar } : {} }).subscribe({
      next: (res) => {
        this.usuarios = res.data ?? [];
        this.total = res.total ?? this.usuarios.length;
        this.cargando = false;
      },
      error: (err: any) => {
        this.cargando = false;
        this.mostrar(err?.mensaje || 'No se pudieron cargar los ciudadanos.', true);
      }
    });
  }

  /** Teléfono: solo números y máximo 10. */
  soloDigitos(v: string): string {
    return (v || '').replace(/\D/g, '').slice(0, 10);
  }

  get requisitos() {
    const v = this.form.password || '';
    return [
      { texto: 'Mínimo 8 caracteres', ok: v.length >= 8 },
      { texto: 'Una mayúscula', ok: /[A-Z]/.test(v) },
      { texto: 'Una minúscula', ok: /[a-z]/.test(v) },
      { texto: 'Un número', ok: /[0-9]/.test(v) }
    ];
  }

  get errores(): Record<string, string> {
    const e: Record<string, string> = {};
    const nombre = this.form.name.trim();
    if (nombre.length < 3) e['name'] = 'Escribe el nombre (mínimo 3 letras).';
    else if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/.test(nombre)) e['name'] = 'El nombre solo puede llevar letras y espacios.';
    const correo = this.form.email.trim();
    if (!correo) e['email'] = 'Escribe el correo.';
    else if (!correo.includes('@')) e['email'] = 'Al correo le falta la @.';
    else if (!PATRON_CORREO.test(correo)) e['email'] = 'Al correo le falta la terminación (ej. @gmail.com).';
    if (this.form.phone.length !== 10) {
      const faltan = 10 - this.form.phone.length;
      e['phone'] = faltan > 0 ? `El teléfono debe tener 10 dígitos (faltan ${faltan}).` : 'El teléfono debe tener 10 dígitos.';
    }
    if ((!this.editando || this.form.password) && this.requisitos.some((r) => !r.ok)) e['password'] = 'La contraseña no cumple los requisitos.';
    return e;
  }

  abrirNuevo(): void {
    this.editando = null;
    this.form = { name: '', email: '', phone: '', password: '' };
    this.abrirModal();
  }

  abrirEditar(u: any): void {
    this.editando = u;
    this.form = { name: u.name, email: u.email, phone: u.phone || '', password: '' };
    this.abrirModal();
  }

  private abrirModal(): void {
    this.intento = false;
    this.errorForm = '';
    this.verPassword = false;
    this.modalAbierto = true;
  }

  guardar(): void {
    this.intento = true;
    if (Object.keys(this.errores).length) {
      this.errorForm = 'Revisa los campos marcados en rojo.';
      return;
    }
    const datos: any = { name: this.form.name.trim(), email: this.form.email.trim().toLowerCase(), phone: this.form.phone };
    if (this.form.password) datos.password = this.form.password;

    this.guardando = true;
    this.errorForm = '';
    const peticion = this.editando ? this.http.put<any>(`${this.api}/${this.editando.id}`, datos) : this.http.post<any>(this.api, datos);
    peticion.subscribe({
      next: (res) => {
        this.guardando = false;
        this.modalAbierto = false;
        this.mostrar(res?.message || 'Ciudadano guardado.');
        this.cargar();
      },
      error: (err: any) => {
        this.guardando = false;
        this.errorForm = err?.mensaje || 'No se pudo guardar.';
      }
    });
  }

  eliminar(u: any): void {
    if (!confirm(`¿Eliminar a ${u.name}? Ya no podrá entrar a la app y se borrarán sus avisos.`)) return;
    this.http.delete<any>(`${this.api}/${u.id}`).subscribe({
      next: (res) => { this.mostrar(res?.message || 'Ciudadano eliminado.'); this.cargar(); },
      error: (err: any) => this.mostrar(err?.mensaje || 'No se pudo eliminar.', true)
    });
  }

  private mostrar(msg: string, error = false): void {
    this.aviso = msg;
    this.avisoError = error;
    setTimeout(() => (this.aviso = ''), 5000);
  }
}
