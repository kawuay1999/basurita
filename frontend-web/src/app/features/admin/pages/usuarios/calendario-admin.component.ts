import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

type Modo = 'pares' | 'impares' | 'dias_semana' | 'personalizado';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * El admin publica qué días del mes pasa el camión.
 * Lo que publique aquí aparece en verde en el calendario de la app del ciudadano.
 */
@Component({
  selector: 'app-calendario-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="aviso" role="status" class="mb-4 p-3 rounded-soft text-sm font-semibold"
         [ngClass]="avisoError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'">{{ aviso }}</div>

    <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <!-- Configuración -->
      <section class="xl:col-span-2 bg-white rounded-softer shadow-soft border border-gray-100 p-6 space-y-5">
        <div>
          <h2 class="text-lg font-bold">Publicar calendario</h2>
          <p class="text-sm text-basurita-muted">Elige el mes y qué días pasa el camión.</p>
        </div>

        <!-- Mes -->
        <div class="flex items-center justify-between bg-basurita-bg rounded-soft p-2">
          <button (click)="cambiarMes(-1)" aria-label="Mes anterior" class="w-9 h-9 rounded-full hover:bg-white flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/></svg>
          </button>
          <span class="font-bold capitalize">{{ nombreMes }} {{ anio }}</span>
          <button (click)="cambiarMes(1)" aria-label="Mes siguiente" class="w-9 h-9 rounded-full hover:bg-white flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/></svg>
          </button>
        </div>

        <!-- Ruta -->
        <div>
          <label class="block text-sm font-medium mb-1" for="cal-ruta">¿Para qué ruta?</label>
          <select id="cal-ruta" [(ngModel)]="rutaId" (ngModelChange)="cargarExistente()" class="input-base">
            <option [ngValue]="null">Todas las rutas</option>
            <option *ngFor="let r of rutas" [ngValue]="r.id">{{ r.nombre }}</option>
          </select>
          <p class="text-xs text-basurita-muted mt-1">Si una ruta tiene su propio calendario, sus vecinos ven ese en lugar del general.</p>
        </div>

        <!-- Modo -->
        <div>
          <p class="block text-sm font-medium mb-2">¿Qué días pasa?</p>
          <div class="grid grid-cols-2 gap-2">
            <button *ngFor="let m of modos" type="button" (click)="elegirModo(m.id)"
                    class="text-left p-3 rounded-soft border-2 transition"
                    [ngClass]="modo === m.id ? 'border-basurita-primary bg-green-50' : 'border-gray-200 hover:border-gray-300'">
              <span class="block font-bold text-sm">{{ m.titulo }}</span>
              <span class="block text-xs text-basurita-muted">{{ m.detalle }}</span>
            </button>
          </div>
        </div>

        <!-- Días de la semana -->
        <div *ngIf="modo === 'dias_semana'">
          <p class="block text-sm font-medium mb-2">Días de la semana</p>
          <div class="flex flex-wrap gap-2">
            <button *ngFor="let d of semana" type="button" (click)="alternarSemana(d.n)"
                    class="w-11 h-11 rounded-full text-sm font-bold border-2 transition"
                    [ngClass]="diasSemana.includes(d.n) ? 'bg-basurita-primary border-basurita-primary text-white' : 'border-gray-200 text-basurita-text hover:border-gray-300'"
                    [attr.aria-pressed]="diasSemana.includes(d.n)" [attr.aria-label]="d.largo">
              {{ d.corto }}
            </button>
          </div>
        </div>

        <p *ngIf="modo === 'personalizado'" class="text-sm text-basurita-muted bg-basurita-bg rounded-soft p-3">
          Haz clic en los días del calendario de la derecha para marcarlos o quitarlos.
        </p>

        <!-- Nota -->
        <div>
          <label class="block text-sm font-medium mb-1" for="cal-nota">Mensaje para los vecinos (opcional)</label>
          <input id="cal-nota" [(ngModel)]="nota" maxlength="255" class="input-base" placeholder="Ej. Saca tu basura antes de las 8:00 a.m.">
        </div>

        <button (click)="publicar()" [disabled]="guardando || diasVista.length === 0"
                class="w-full py-3 rounded-soft bg-basurita-primary text-white font-bold shadow-soft hover:bg-basurita-primary-dark disabled:opacity-60">
          {{ guardando ? 'Publicando...' : (existente ? 'Actualizar calendario' : 'Publicar calendario') }} · {{ diasVista.length }} días
        </button>
      </section>

      <!-- Vista previa -->
      <section class="xl:col-span-3 space-y-6">
        <div class="bg-white rounded-softer shadow-soft border border-gray-100 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold">Así lo verán los ciudadanos</h2>
            <span class="text-sm font-semibold text-basurita-primary">{{ diasVista.length }} días de recolección</span>
          </div>
          <div class="grid grid-cols-7 text-center mb-2">
            <span *ngFor="let d of semana" class="text-xs font-bold uppercase text-basurita-muted">{{ d.corto }}</span>
          </div>
          <div class="grid grid-cols-7 gap-2">
            <div *ngFor="let c of celdas" class="aspect-square">
              <button *ngIf="c" type="button" (click)="alternarDia(c)" [disabled]="modo !== 'personalizado'"
                      class="w-full h-full rounded-2xl text-sm font-bold flex items-center justify-center transition"
                      [ngClass]="[
                        diasVista.includes(c) ? 'bg-basurita-primary text-white shadow-sm' : 'bg-gray-50 text-basurita-text',
                        modo === 'personalizado' ? 'cursor-pointer hover:ring-2 hover:ring-basurita-primary' : 'cursor-default'
                      ]">
                {{ c }}
              </button>
            </div>
          </div>
        </div>

        <!-- Publicados este mes -->
        <div class="bg-white rounded-softer shadow-soft border border-gray-100 overflow-hidden">
          <div class="p-5 border-b border-gray-100">
            <h2 class="text-lg font-bold">Publicados en <span class="capitalize">{{ nombreMes }}</span></h2>
          </div>
          <p *ngIf="publicados.length === 0" class="p-6 text-center text-sm text-basurita-muted">Todavía no hay calendario publicado para este mes.</p>
          <ul class="divide-y divide-gray-100">
            <li *ngFor="let p of publicados" class="p-5 flex flex-wrap items-center gap-3">
              <span class="w-10 h-10 rounded-full bg-green-50 text-basurita-primary flex items-center justify-center shrink-0 font-black">{{ p.dias.length }}</span>
              <div class="flex-1 min-w-48">
                <p class="font-semibold">{{ p.ruta?.nombre || 'Todas las rutas' }}</p>
                <p class="text-sm text-basurita-muted">{{ describir(p) }}{{ p.nota ? ' · ' + p.nota : '' }}</p>
              </div>
              <button (click)="editar(p)" class="text-sm font-semibold text-basurita-primary-dark hover:underline">Editar</button>
              <button (click)="eliminar(p)" class="text-sm font-semibold text-red-600 hover:underline">Eliminar</button>
            </li>
          </ul>
        </div>
      </section>
    </div>
  `
})
export class CalendarioAdminComponent implements OnInit {
  readonly modos: { id: Modo; titulo: string; detalle: string }[] = [
    { id: 'pares', titulo: 'Días pares', detalle: '2, 4, 6, 8...' },
    { id: 'impares', titulo: 'Días impares', detalle: '1, 3, 5, 7...' },
    { id: 'dias_semana', titulo: 'Días de la semana', detalle: 'Ej. lunes y jueves' },
    { id: 'personalizado', titulo: 'Elegir días', detalle: 'Marcar en el calendario' }
  ];
  readonly semana = [
    { n: 1, corto: 'L', largo: 'Lunes' }, { n: 2, corto: 'M', largo: 'Martes' }, { n: 3, corto: 'M', largo: 'Miércoles' },
    { n: 4, corto: 'J', largo: 'Jueves' }, { n: 5, corto: 'V', largo: 'Viernes' }, { n: 6, corto: 'S', largo: 'Sábado' },
    { n: 7, corto: 'D', largo: 'Domingo' }
  ];

  anio = new Date().getFullYear();
  mes = new Date().getMonth() + 1;
  rutas: { id: number; nombre: string }[] = [];
  rutaId: number | null = null;
  modo: Modo = 'pares';
  diasSemana: number[] = [1, 4];
  diasPersonalizados: number[] = [];
  nota = '';

  publicados: any[] = [];
  existente: any = null;
  guardando = false;
  aviso = '';
  avisoError = false;

  private api = `${environment.apiUrl}/v1/admin/calendarios`;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargar();
  }

  get nombreMes(): string {
    return MESES[this.mes - 1];
  }

  /** Días del mes con huecos al inicio para que empiece en lunes. */
  get celdas(): (number | null)[] {
    const vacias = (new Date(this.anio, this.mes - 1, 1).getDay() + 6) % 7;
    const total = new Date(this.anio, this.mes, 0).getDate();
    return [...Array(vacias).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  }

  /** Mismo cálculo que el servidor, para la vista previa. */
  get diasVista(): number[] {
    const total = new Date(this.anio, this.mes, 0).getDate();
    const dias: number[] = [];
    for (let d = 1; d <= total; d++) {
      const iso = ((new Date(this.anio, this.mes - 1, d).getDay() + 6) % 7) + 1; // 1 = lunes
      const incluir =
        this.modo === 'pares' ? d % 2 === 0 :
        this.modo === 'impares' ? d % 2 === 1 :
        this.modo === 'dias_semana' ? this.diasSemana.includes(iso) :
        this.diasPersonalizados.includes(d);
      if (incluir) dias.push(d);
    }
    return dias;
  }

  cambiarMes(delta: number): void {
    this.mes += delta;
    if (this.mes < 1) { this.mes = 12; this.anio--; }
    if (this.mes > 12) { this.mes = 1; this.anio++; }
    this.cargar();
  }

  elegirModo(m: Modo): void {
    // Al pasar a "Elegir días" se parte de lo que se ve en la vista previa
    if (m === 'personalizado' && this.modo !== 'personalizado') this.diasPersonalizados = [...this.diasVista];
    this.modo = m;
  }

  alternarSemana(n: number): void {
    this.diasSemana = this.diasSemana.includes(n) ? this.diasSemana.filter((d) => d !== n) : [...this.diasSemana, n].sort();
  }

  alternarDia(d: number): void {
    if (this.modo !== 'personalizado') return;
    this.diasPersonalizados = this.diasPersonalizados.includes(d)
      ? this.diasPersonalizados.filter((x) => x !== d)
      : [...this.diasPersonalizados, d].sort((a, b) => a - b);
  }

  cargar(): void {
    this.http.get<any>(this.api, { params: { anio: this.anio, mes: this.mes } }).subscribe({
      next: (res) => {
        this.publicados = res.data ?? [];
        this.rutas = res.rutas ?? [];
        this.cargarExistente();
      },
      error: (err: any) => this.mostrar(err?.mensaje || 'No se pudo cargar el calendario.', true)
    });
  }

  /** Si ya hay calendario para ese mes y ruta, se cargan sus valores para editarlo. */
  cargarExistente(): void {
    this.existente = this.publicados.find((p) => (p.ruta_id ?? null) === this.rutaId) ?? null;
    if (this.existente) this.editar(this.existente);
  }

  editar(p: any): void {
    this.rutaId = p.ruta_id ?? null;
    this.existente = p;
    this.modo = p.modo;
    this.diasSemana = p.dias_semana ?? [1, 4];
    this.diasPersonalizados = [...(p.dias ?? [])];
    this.nota = p.nota ?? '';
  }

  publicar(): void {
    if (this.modo === 'dias_semana' && this.diasSemana.length === 0) {
      this.mostrar('Elige al menos un día de la semana.', true);
      return;
    }
    this.guardando = true;
    const datos: any = { anio: this.anio, mes: this.mes, ruta_id: this.rutaId, modo: this.modo, nota: this.nota.trim() || null };
    if (this.modo === 'dias_semana') datos.dias_semana = this.diasSemana;
    if (this.modo === 'personalizado') datos.dias = this.diasPersonalizados;

    this.http.post<any>(this.api, datos).subscribe({
      next: (res) => {
        this.guardando = false;
        this.mostrar(res?.message || 'Calendario publicado.');
        this.cargar();
      },
      error: (err: any) => {
        this.guardando = false;
        this.mostrar(err?.mensaje || 'No se pudo publicar el calendario.', true);
      }
    });
  }

  eliminar(p: any): void {
    if (!confirm(`¿Eliminar el calendario de ${p.ruta?.nombre || 'todas las rutas'} de ${this.nombreMes}?`)) return;
    this.http.delete<any>(`${this.api}/${p.id}`).subscribe({
      next: () => { this.mostrar('Calendario eliminado.'); this.existente = null; this.cargar(); },
      error: (err: any) => this.mostrar(err?.mensaje || 'No se pudo eliminar.', true)
    });
  }

  describir(p: any): string {
    const nombres = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'];
    if (p.modo === 'pares') return 'Días pares';
    if (p.modo === 'impares') return 'Días impares';
    if (p.modo === 'dias_semana') return 'Los ' + (p.dias_semana ?? []).map((d: number) => nombres[d]).join(', ');
    return `${p.dias.length} días elegidos`;
  }

  private mostrar(msg: string, error = false): void {
    this.aviso = msg;
    this.avisoError = error;
    setTimeout(() => (this.aviso = ''), 5000);
  }
}
