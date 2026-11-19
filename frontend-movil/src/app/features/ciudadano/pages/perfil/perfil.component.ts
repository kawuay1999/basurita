import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CiudadanoService } from '../../services/ciudadano.service';

/** "Mis datos": ciudadano o conductor actualizan su nombre y teléfono. */
@Component({
  selector: 'app-perfil-ciudadano',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-dvh bg-basurita-bg">
      <header class="bg-basurita-primary text-white px-4 pt-6 pb-16">
        <a [routerLink]="inicio" aria-label="Regresar"
           class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-4">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/></svg>
        </a>
        <h1 class="text-2xl font-bold">Mis datos</h1>
      </header>

      <div class="px-4 -mt-10">
        <div class="bg-white rounded-softer shadow-soft p-5 flex items-center gap-4 mb-4">
          <div class="w-14 h-14 rounded-full bg-basurita-primary text-white font-black text-xl flex items-center justify-center">
            {{ inicial }}
          </div>
          <div class="min-w-0">
            <p class="font-bold text-basurita-text truncate">{{ form.value.name || 'Usuario' }}</p>
            <p class="text-sm text-basurita-muted truncate">{{ correo }}</p>
            <span *ngIf="!esCiudadano" class="inline-block mt-1 px-2 py-0.5 rounded-full bg-green-50 text-basurita-primary text-xs font-bold">Conductor</span>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="guardar()" class="bg-white rounded-softer shadow-soft p-5 space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium text-basurita-text">Nombre completo</label>
            <input id="name" type="text" formControlName="name" class="input-base mt-1">
          </div>
          <div>
            <label for="email" class="block text-sm font-medium text-basurita-text">Correo electrónico</label>
            <input id="email" type="email" [value]="correo" disabled class="input-base mt-1 bg-gray-100 text-gray-500">
            <p class="text-xs text-basurita-muted mt-1">El correo no se puede cambiar.</p>
          </div>
          <div>
            <label for="phone" class="block text-sm font-medium text-basurita-text">Teléfono (10 dígitos)</label>
            <input id="phone" type="tel" formControlName="phone" class="input-base mt-1" placeholder="5512345678">
          </div>

          <p *ngIf="mensaje" role="status" class="text-sm font-semibold"
             [ngClass]="error ? 'text-basurita-danger' : 'text-basurita-primary'">{{ mensaje }}</p>

          <button type="submit" [disabled]="guardando"
                  class="w-full py-3.5 rounded-soft bg-basurita-primary text-white font-bold shadow-soft active:scale-[0.98] transition disabled:opacity-60">
            {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </form>

        <a *ngIf="esCiudadano" routerLink="/ciudadano/elegir-casa"
           class="mt-4 mb-8 bg-white rounded-softer shadow-soft p-5 flex items-center gap-4 active:bg-gray-50">
          <svg class="w-6 h-6 text-basurita-primary shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/></svg>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-basurita-text">Ubicación de mi casa</p>
            <p class="text-sm text-basurita-muted truncate">{{ direccion || 'Sin elegir' }}</p>
          </div>
          <span class="text-basurita-primary font-bold text-sm">Cambiar</span>
        </a>
      </div>
    </div>
  `
})
export class PerfilComponent implements OnInit {
  form: FormGroup;
  correo = '';
  direccion = '';
  inicial = '?';
  guardando = false;
  mensaje = '';
  error = false;
  esCiudadano = true;
  inicio = '/ciudadano/mapa';

  constructor(private fb: FormBuilder, private ciudadanoService: CiudadanoService) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.pattern('^[0-9]{10}$')]]
    });
  }

  ngOnInit(): void {
    const local = this.ciudadanoService.perfilLocal();
    this.esCiudadano = local?.role !== 'operador';
    this.inicio = this.esCiudadano ? '/ciudadano/mapa' : '/operador/dashboard';
    this.cargar(local);
    this.ciudadanoService.getPerfil().subscribe({ next: (p) => this.cargar(p) });
  }

  private cargar(p: any): void {
    this.form.patchValue({ name: p?.name ?? '', phone: p?.phone ?? '' });
    this.correo = p?.email ?? '';
    this.direccion = p?.direccion_casa ?? '';
    this.inicial = (p?.name ?? '?').trim().charAt(0).toUpperCase();
  }

  guardar(): void {
    if (this.form.invalid) {
      this.error = true;
      this.mensaje = 'Revisa el nombre (mínimo 3 letras) y el teléfono (10 dígitos).';
      return;
    }
    this.guardando = true;
    this.mensaje = '';

    this.ciudadanoService.actualizarPerfil(this.form.value).subscribe({
      next: (p) => {
        this.guardando = false;
        this.error = false;
        this.mensaje = 'Tus datos se guardaron correctamente.';
        this.cargar(p);
      },
      error: (err: any) => {
        this.guardando = false;
        this.error = true;
        this.mensaje = err?.mensaje || 'No se pudieron guardar tus datos.';
      }
    });
  }
}
