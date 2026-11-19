import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Configuración de la APK (Capacitor).
 * appId debe ser igual al "nombre del paquete" registrado en Firebase.
 */
const config: CapacitorConfig = {
  appId: 'mx.gob.basurita.app',
  appName: 'Basurita',
  webDir: 'dist/frontend-movil/browser',
  server: {
    // La app corre como http://localhost dentro del celular: así puede llamar a un
    // backend http (pruebas en tu red) y sigue pudiendo pedir la ubicación.
    androidScheme: 'http',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
