# BASURITA — Plataforma Municipal de Rastreo y Gestión de Recolección de Residuos

Sistema integral para el monitoreo en tiempo real de unidades recolectoras de basura, notificaciones por proximidad geográfica, operación sin conexión en campo y gestión operativa municipal.

---

## Cómo correrlo para probar (3 terminales)

Abre **3 terminales** en VS Code (desde la carpeta `basurita`) y corre una cosa en cada una. Las tres deben quedarse abiertas mientras pruebas.

| # | Qué es | Comando | Dónde se abre |
|---|---|---|---|
| 1 | Backend (API + base de datos) | `cd backend; php artisan serve` | http://127.0.0.1:8000 (no se abre en el navegador) |
| 2 | Panel web del **administrador** | `cd frontend-web; npm start` | http://localhost:4200 |
| 3 | App **móvil** (ciudadano y conductor) | `cd frontend-movil; npm start` | PC: https://localhost:4300 · Celular: https://IP-DE-TU-PC:4300 |

- Siempre arranca primero el **backend** (terminal 1).
- La app móvil corre en **https** porque el celular solo pide permiso de ubicación en páginas seguras. La primera vez el navegador dirá "La conexión no es privada": toca **Configuración avanzada → Continuar**. Es normal en desarrollo.
- La app móvil le pasa las llamadas al backend por sí misma (ver `frontend-movil/proxy.conf.json`), así que el celular **solo** necesita llegar al puerto 4300.
- Para saber la IP de tu PC: `ipconfig` → "Dirección IPv4" de tu Wi-Fi. PC y celular deben estar en el mismo Wi-Fi. Si Windows pregunta por el firewall, permite el acceso en redes privadas.
- Solo la primera vez (o después de bajar cambios): `cd backend; php artisan migrate` y `npm install` dentro de cada frontend.
- **Probar al conductor sin salir a la calle:** entra como conductor, inicia la ruta y toca **"Modo prueba: simular el recorrido"** (abajo). El camión avanza solo por la ruta y, en otro celular o pestaña, el ciudadano lo ve moverse y le llegan los avisos. Ese botón solo existe mientras desarrollamos (no sale en la APK final).

### Generar la APK (Capacitor)

La app móvil se empaqueta como APK con **Capacitor** (el mismo de Ionic). La carpeta `frontend-movil/android` es el proyecto de Android Studio.

1. En `frontend-movil/src/environments/environment.apk.ts` pon la dirección del backend:
   - Pruebas en tu Wi-Fi: `http://IP-DE-TU-PC:8000/api` y arranca el backend con `cd backend; php artisan serve --host=0.0.0.0`. **La IP se actualiza sola** al correr `npm run apk` (el router puede cambiarla de un día a otro; si la APK dice "No se pudo conectar con el servidor", vuelve a generarla).
   - Cuando el backend esté en internet: `https://tu-dominio/api` (así funciona en cualquier celular, con datos o Wi-Fi).
2. Construye la APK:
   ```
   cd frontend-movil; npm run apk
   ```
   Queda en `frontend-movil/android/app/build/outputs/apk/debug/app-debug.apk`. Pásala al celular (cable, WhatsApp, Drive) e instálala (Android pedirá permitir "instalar apps desconocidas").
3. Para abrirla en Android Studio (emulador, firmar versión final): `npm run android`.

### Servidor en internet (Railway)

El backend está publicado en **https://backend-production-a85cbd7d.up.railway.app** (proyecto `basurita` en Railway, con base de datos PostgreSQL). La APK y el panel en modo nube usan ese servidor, así que funcionan sin tu PC prendida.

- Panel del admin contra el servidor en internet: `cd frontend-web; npm run start:nube` (con `npm start` usa tu backend local).
- Subir cambios del backend: `cd backend; railway up --service backend`. Antes de arrancar, Railway corre `php artisan migrate --force && php artisan db:seed --force` (el seeder no duplica datos).
- Ver errores del servidor: `railway logs --service backend`.
- Variables (APP_KEY, DB_URL, FIREBASE_CREDENTIALS_JSON…): en el panel de Railway o con `railway variable list --service backend`. Son secretas: no las compartas.
- **Plan:** prueba gratis de Railway (30 días, hasta ~19 dic 2026). Antes de que venza lo pasamos a Heroku con el GitHub Student Pack (hay un recordatorio agendado para el 10 dic).

**Notificaciones push (Firebase):**
- `frontend-movil/android/app/google-services.json`: ya está puesto (app Android `mx.gob.basurita.app`). No se sube a git.
- Para que el **backend** pueda mandar los avisos: Firebase → Configuración del proyecto → **Cuentas de servicio** → **Generar nueva clave privada**. Guarda el archivo descargado como `backend/storage/app/private/firebase/service-account.json`. Es secreto: no lo compartas ni lo subas a git (esa carpeta ya está ignorada).
- Sin ese archivo todo funciona igual, pero los avisos solo se ven al abrir la app.

**Usuarios de prueba** (vienen de `backend/database/seeders/BasuritaDemoSeeder.php`):

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador (web) | admin@basurita.gob.mx | Admin2026* |
| Conductor con ruta hoy (móvil) | operador@basurita.gob.mx | Operador2026* |
| Conductor sin ruta (móvil) | jorge.conductor@basurita.test | Conductor2026* |
| Ciudadano (móvil) | ana.ciudadana@basurita.test | Ciudadana2026* |

---

## Arquitectura del Proyecto

```text
basurita/
├── backend/          # API REST en Laravel 11 + PostgreSQL + Laravel Sanctum
├── frontend-movil/   # App Ciudadano & Operador (Angular + Tailwind CSS v3 + Leaflet)
└── frontend-web/     # Panel Administrativo Web (Angular + Tailwind CSS v3 + Leaflet)