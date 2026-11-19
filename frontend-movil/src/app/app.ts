import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AtrasService } from './core/services/atras.service';

// Tiempo mínimo que se ve la pantalla de inicio (logo + barra de carga)
const SPLASH_MINIMO_MS = 2300;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  constructor(private atras: AtrasService) {}

  ngOnInit(): void {
    this.atras.iniciar();
    this.ocultarSplash();
  }

  /** Desvanece la pantalla de inicio de index.html cuando ya pasó su animación. */
  private ocultarSplash(): void {
    const splash = document.getElementById('splash');
    if (!splash) return;
    const espera = Math.max(0, SPLASH_MINIMO_MS - performance.now());
    setTimeout(() => {
      splash.classList.add('oculto');
      setTimeout(() => splash.remove(), 500);
    }, espera);
  }
}
