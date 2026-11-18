import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-basurita-surface p-6 rounded-softer shadow-soft border border-gray-100 flex items-center gap-4">
      
      <!-- Indicador visual del estado -->
      <div [ngClass]="iconContainerClasses[status]" class="p-4 rounded-soft shrink-0">
        <!-- Lucide Icons (SVG Inline) -->
        <svg *ngIf="status === 'pending'" class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        <svg *ngIf="status === 'active'" class="w-6 h-6 text-basurita-primary animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
        <svg *ngIf="status === 'finished'" class="w-6 h-6 text-basurita-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
      </div>

      <!-- Textos -->
      <div class="flex-1">
        <h3 class="text-sm font-semibold text-basurita-muted uppercase tracking-wider mb-1">{{ labels[status] }}</h3>
        <p class="text-lg font-bold text-basurita-text">
          <ng-content select="[title]"></ng-content>
        </p>
        <p class="text-sm text-basurita-muted mt-1">
          <ng-content select="[description]"></ng-content>
        </p>
      </div>
    </div>
  `
})
export class StatusCardComponent {
  @Input() status: 'pending' | 'active' | 'finished' = 'pending';

  labels = {
    pending: 'Aún no inicia',
    active: 'En ruta ahora',
    finished: 'Ruta finalizada'
  };

  iconContainerClasses = {
    pending: 'bg-gray-100',
    active: 'bg-blue-50 border border-blue-100',
    finished: 'bg-green-50 border border-green-100'
  };
}