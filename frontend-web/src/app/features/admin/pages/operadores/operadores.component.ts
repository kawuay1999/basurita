import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { OperadorService } from '../../../operadores/services/operador.service';

/** Alta, edición y baja de operadores (conductores de los camiones). */
@Component({
  selector: 'app-admin-operadores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-bold text-basurita-text">Operadores</h1>
          <p class="text-sm text-basurita-muted">Los conductores entran a la app móvil con el correo y la contraseña que les crees aquí.</p>
        </div>
        <button (click)="abrirNuevo()" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-soft bg-basurita-primary text-white font-semibold shadow-soft hover:bg-basurita-primary-dark">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14m7-7H5"/></svg>
          Nuevo operador
        </button>
      </div>

      <div *ngIf="aviso" role="status" class="p-3 rounded-soft text-sm font-semibold"
           [ngClass]="avisoError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'">{{ aviso }}</div>

      <div class="bg-white rounded-softer shadow-soft border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 tracking-wider">
                <th class="p-4 font-semibold">Nombre</th>
                <th class="p-4 font-semibold">Correo (usuario)</th>
                <th class="p-4 font-semibold">Teléfono</th>
                <th class="p-4 font-semibold">Alta</th>
                <th class="p-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 text-sm text-basurita-text">
              <tr *ngIf="cargando"><td colspan="5" class="p-6 text-center text-basurita-muted">Cargando operadores...</td></tr>
              <tr *ngIf="!cargando && operadores.length === 0"><td colspan="5" class="p-6 text-center text-basurita-muted">Aún no hay operadores. Crea el primero con "Nuevo operador".</td></tr>
              <tr *ngFor="let op of operadores" class="hover:bg-gray-50">
                <td class="p-4">
                  <div class="flex items-center gap-3">
                    <span class="w-9 h-9 rounded-full bg-basurita-primary text-white font-bold flex items-center justify-center">{{ (op.name || '?').charAt(0).toUpperCase() }}</span>
                    <span class="font-semibold">{{ op.name }}</span>
                  </div>
                </td>
                <td class="p-4">{{ op.email }}</td>
                <td class="p-4">{{ op.phone || op.telefono || '—' }}</td>
                <td class="p-4 text-basurita-muted">{{ op.created_at | date:'dd/MM/yyyy' }}</td>
                <td class="p-4 text-right space-x-3 whitespace-nowrap">
                  <button (click)="abrirEditar(op)" class="text-basurita-primary-dark hover:underline font-semibold">Editar</button>
                  <button (click)="eliminar(op)" class="text-red-600 hover:underline font-semibold">Eliminar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal crear / editar -->
    <div *ngIf="modalAbierto" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40" (click)="cerrar()"></div>
      <form [formGroup]="form" (ngSubmit)="guardar()" role="dialog" aria-modal="true"
            class="relative bg-white rounded-softer shadow-floating w-full max-w-md p-6 space-y-4">
        <h2 class="text-xl font-bold text-basurita-text">{{ editando ? 'Editar operador' : 'Nuevo operador' }}</h2>

        <div>
          <label class="block text-sm font-medium mb-1" for="op-name">Nombre completo</label>
          <input id="op-name" formControlName="name" class="input-base" placeholder="Ej. Juan Pérez López">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" for="op-email">Correo (con este inicia sesión)</label>
          <input id="op-email" type="email" formControlName="email" class="input-base" placeholder="juan@basurita.gob.mx">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" for="op-phone">Teléfono</label>
          <input id="op-phone" type="tel" formControlName="phone" class="input-base" placeholder="5512345678">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" for="op-pass">
            Contraseña <span *ngIf="editando" class="text-basurita-muted font-normal">(déjala vacía para no cambiarla)</span>
          </label>
          <div class="relative">
            <input id="op-pass" [type]="verPassword ? 'text' : 'password'" formControlName="password" class="input-base pr-12" placeholder="Mínimo 8 caracteres">
            <button type="button" (click)="verPassword = !verPassword" [attr.aria-label]="verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path *ngIf="!verPassword" stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                <path *ngIf="verPassword" stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"/>
              </svg>
            </button>
          </div>
        </div>

        <p *ngIf="errorForm" class="text-sm text-red-700 font-semibold">{{ errorForm }}</p>

        <div class="flex justify-end gap-3 pt-2">
          <button type="button" (click)="cerrar()" class="px-4 py-2.5 rounded-soft border border-gray-300 font-semibold">Cancelar</button>
          <button type="submit" [disabled]="guardando" class="px-4 py-2.5 rounded-soft bg-basurita-primary text-white font-semibold disabled:opacity-60">
            {{ guardando ? 'Guardando...' : (editando ? 'Guardar cambios' : 'Crear operador') }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class OperadoresComponent implements OnInit {
  operadores: any[] = [];
  cargando = true;
  aviso = '';
  avisoError = false;

  modalAbierto = false;
  editando: any = null;
  guardando = false;
  errorForm = '';
  verPassword = false;
  form: FormGroup;

  constructor(private fb: FormBuilder, private operadorService: OperadorService) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      password: ['']
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.operadorService.getAll().subscribe({
      next: (res: any) => {
        this.operadores = res.data ?? [];
        this.cargando = false;
      },
      error: (err: any) => {
        this.cargando = false;
        this.mostrar(err?.mensaje || 'No se pudieron cargar los operadores.', true);
      }
    });
  }

  abrirNuevo(): void {
    this.editando = null;
    this.form.reset({ name: '', email: '', phone: '', password: '' });
    this.abrir();
  }

  abrirEditar(op: any): void {
    this.editando = op;
    this.form.reset({ name: op.name, email: op.email, phone: op.phone || op.telefono || '', password: '' });
    this.abrir();
  }

  private abrir(): void {
    this.errorForm = '';
    this.verPassword = false;
    this.modalAbierto = true;
  }

  cerrar(): void {
    this.modalAbierto = false;
  }

  guardar(): void {
    const v = this.form.value;
    if (this.form.invalid) {
      this.errorForm = 'Revisa los datos: nombre (mín. 3 letras), correo válido y teléfono de 10 dígitos.';
      return;
    }
    if ((!this.editando && (v.password || '').length < 8) || (this.editando && v.password && v.password.length < 8)) {
      this.errorForm = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }

    const datos: any = { name: v.name.trim(), email: v.email.trim(), phone: v.phone };
    if (v.password) datos.password = v.password;

    this.guardando = true;
    this.errorForm = '';
    const peticion = this.editando
      ? this.operadorService.updateOperador(this.editando.id, datos)
      : this.operadorService.createOperador(datos);

    peticion.subscribe({
      next: (res: any) => {
        this.guardando = false;
        this.modalAbierto = false;
        this.mostrar(res?.message || 'Operador guardado.');
        this.cargar();
      },
      error: (err: any) => {
        this.guardando = false;
        this.errorForm = err?.mensaje || 'No se pudo guardar el operador.';
      }
    });
  }

  eliminar(op: any): void {
    if (!confirm(`¿Eliminar al operador ${op.name}? Ya no podrá entrar a la app y se borrará su historial de rutas.`)) return;
    this.operadorService.deleteOperador(op.id).subscribe({
      next: (res: any) => {
        this.mostrar(res?.message || 'Operador eliminado.');
        this.cargar();
      },
      error: (err: any) => this.mostrar(err?.mensaje || 'No se pudo eliminar el operador.', true)
    });
  }

  private mostrar(msg: string, error = false): void {
    this.aviso = msg;
    this.avisoError = error;
    setTimeout(() => (this.aviso = ''), 5000);
  }
}
