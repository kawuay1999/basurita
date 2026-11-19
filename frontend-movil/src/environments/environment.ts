export const environment = {
  production: false,
  // Ruta relativa: el servidor de Angular (npm start) reenvía /api al backend
  // en http://127.0.0.1:8000 (ver proxy.conf.json). Así funciona igual en la PC
  // y en el celular, y la app puede ir por HTTPS (necesario para pedir ubicación).
  apiUrl: '/api',
  // Botón "simular el recorrido" del conductor (solo para pruebas)
  modoPrueba: true
};
