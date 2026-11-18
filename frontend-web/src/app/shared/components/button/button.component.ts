import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      [type]="type"
      [disabled]="disabled || loading"
      (click)="onClick.emit($event)"
      [ngClass]="[
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full flex justify-center' : 'inline-flex justify-center',
        disabled || loading ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-0.5 active:translate-y-0'
      ]">
      
      <!-- Icono de carga con Lucide (representación en SVG puro) -->
      <svg *ngIf="loading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      
      <!-- Contenido proyectado (Texto/Iconos) -->
      <span class="flex items-center gap-2">
        <ng-content></ng-content>
      </span>
    </button>
  `
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'danger' | 'outline' = 'primary';
  @Input() size: 'normal' | 'operator' = 'normal'; // operator = 64x64dp mínimo (RNF-21)
  @Input() type: 'button' | 'submit' = 'button';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Input() fullWidth: boolean = false;
  @Output() onClick = new EventEmitter<Event>();

  baseClasses = 'items-center font-semibold rounded-soft transition-all duration-200 shadow-sm';
  
  variantClasses = {
    primary: 'bg-basurita-primary hover:bg-basurita-primary-dark text-white',
    secondary: 'bg-basurita-secondary hover:bg-basurita-secondary-dark text-white',
    danger: 'bg-basurita-danger hover:bg-basurita-danger-dark text-white',
    outline: 'bg-transparent border-2 border-gray-200 text-basurita-text hover:border-basurita-primary hover:text-basurita-primary'
  };

  sizeClasses = {
    normal: 'px-6 py-3 text-base',
    operator: 'px-8 py-5 min-h-[64px] min-w-[64px] text-xl uppercase tracking-wide'
  };
}