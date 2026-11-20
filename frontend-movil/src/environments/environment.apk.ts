// Configuración que se usa al construir la APK (npm run apk).
// La app ya no pasa por "npm start", así que necesita la dirección completa del backend.
export const environment = {
  production: true,
  // Backend publicado en internet (Railway): funciona con datos móviles o cualquier Wi-Fi.
  // Para probar contra tu PC en tu Wi-Fi, cámbialo a 'http://IP-DE-TU-PC:8000/api'
  // (npm run apk pone sola la IP actual) y corre "php artisan serve --host=0.0.0.0".
  apiUrl: 'https://backend-production-a85cbd7d.up.railway.app/api',
  // Botón "simular el recorrido" del conductor. Ponlo en false para la versión final.
  modoPrueba: true
};
