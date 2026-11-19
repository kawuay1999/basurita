// zone.js se carga como "polyfill" desde angular.json: así Angular actualiza la
// pantalla automáticamente cuando llegan respuestas del servidor o del GPS.
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
