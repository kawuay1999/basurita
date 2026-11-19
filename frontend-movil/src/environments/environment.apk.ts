// Configuración que se usa al construir la APK (npm run apk).
// La app ya no pasa por "npm start", así que necesita la dirección completa del backend.
export const environment = {
  production: true,
  // Pruebas en tu red: IP de tu PC con "php artisan serve --host=0.0.0.0".
  // Cuando el backend esté en internet, cambia esto por https://tu-dominio/api
  apiUrl: 'http://192.168.0.4:8000/api',
  // Botón "simular el recorrido" del conductor. Ponlo en false para la versión final.
  modoPrueba: true
};
