# Basurita — Resumen de avances

Última actualización: 19 de noviembre de 2026.

Rama con todo el trabajo: `feat/apps-conectadas-conductor-apk`, commit `4d2003a` (todavía sin subir a GitHub; falta el permiso de escritura en `kawuay1999/basurita`).

---

## 1. Qué es el proyecto

Sistema municipal para rastrear camiones recolectores de basura en tiempo real (Tecámac, Edo. Méx.). Tiene tres partes:

| Parte | Tecnología | Para quién |
|---|---|---|
| `backend/` | Laravel 11 + Sanctum (tokens) + SQLite local | API para todos |
| `frontend-web/` | Angular 21 + Tailwind 4 + Leaflet | **Administrador** (panel web) |
| `frontend-movil/` | Angular 21 + Tailwind 4 + Leaflet + **Capacitor 8** | **Ciudadano** y **conductor** (APK Android) |

Mapas: **OpenStreetMap** (gratis, sin API key). Direcciones: Nominatim (OSM). Notificaciones push: **Firebase Cloud Messaging**.

---

## 2. Estado inicial (lo que encontramos)

- Las interfaces no estaban conectadas al backend en varios puntos.
- Las rutas con rol daban **error 500** (el middleware `role` no estaba registrado).
- Monitoreo y reportes del admin daban error 500 (faltaban relaciones en el modelo `Jornada`).
- La app móvil no actualizaba la pantalla después de las respuestas del servidor (Angular 21 sin zone.js).
- El ciudadano dependía de una "colonia" para todo (camión, historial), y los usuarios nuevos no tenían colonia.
- El panel web tenía datos fijos (números falsos) y no había dónde crear operadores ni asignar rutas.

---

## 3. Backend (Laravel)

### Arreglos base
- Middleware `role` registrado (`bootstrap/app.php`); errores de la API en JSON y en español.
- Relaciones `ubicaciones()` e `incidencias()` en `Jornada`.
- **Zona horaria** de México (`America/Mexico_City`); la hora que manda el celular (UTC) se guarda en hora local.
- **Idioma español** (`APP_LOCALE=es`, `lang/es/validation.php`). Los errores ahora son concretos, por ejemplo "Ese correo ya está registrado.".

### Ciudadano (todo basado en la ubicación de su casa, ya no en colonia)
- `GET/PUT /v1/perfil`: mis datos para cualquier rol.
- `PUT /v1/ciudadano/casa`: guarda la casa con coordenadas y dirección (columna nueva `direccion_casa`).
- `GET /v1/ciudadano/camion-cercano`: el camión en ruta más cercano a su casa (hasta 5 km), con distancia, unidad y si perdió señal.
- `GET /v1/ciudadano/historial`: últimos 7 días; indica si el camión pasó a 300 m o menos de su casa y a qué hora.
- `GET /v1/ciudadano/notificaciones`: sus avisos.

### Conductor
- `GET /v1/operador/jornada-hoy`, `POST iniciar-ruta`, `POST finalizar-ruta`, `POST gps`.
- **Rutas con recorrido:** columna nueva `recorrido` en `rutas` (lista de puntos [lat, lng] por calles reales). La Ruta Sur de prueba tiene 30 puntos en Los Héroes Tecámac.
- `POST /v1/operador/avisar-vecinos` (avisos rápidos):
  - "Ya voy pasando" (solo a vecinos a menos de 600 m).
  - "Ya inicié el recorrido", "Voy con retraso" y "Hoy no podré pasar" (a todos los vecinos de la ruta).
  - El mismo aviso no se repite antes de 3 minutos.
- Aviso automático "el camión está a unos minutos de tu casa" cuando el camión entra al radio del ciudadano (geocerca).

### Administrador
- CRUD de operadores (no deja borrar a un operador con ruta activa).
- CRUD de jornadas (asignaciones). No deja usar al mismo operador o al mismo camión dos veces el mismo día, y al asignar avisa por push al conductor.
- `GET /v1/admin/dashboard` con estadísticas reales y **estatus de camiones**: en ruta, programado, disponible, mantenimiento y baja.

### Notificaciones push (Firebase)
- `FcmService` usa la API **FCM v1** con cuenta de servicio (la API vieja de FCM ya no funciona).
- `POST /v1/fcm-token`: el celular registra su token (ciudadano y conductor).
- Falta que pongas la clave en `backend/storage/app/private/firebase/service-account.json` (ver sección 8). Sin ella todo funciona, pero los avisos solo se ven con la app abierta.

### Archivos nuevos importantes
`CiudadanoController`, `PerfilController`, `AvisoVecinosController`, `FcmService`, `VecinosRutaService`, `app/Support/Geo.php` (distancias), dos migraciones (`direccion_casa` y `recorrido`).

---

## 4. App móvil (ciudadano y conductor)

### General
- **Animación de inicio:** logo con rebote, nombre "Basurita", lema y barra de carga (unos 2 s).
- **Login y registro** con ícono de ojo para ver la contraseña. El registro ya no pide colonia: nombre, correo, teléfono (10 dígitos) y contraseña.
- **Permiso de ubicación** al entrar (ciudadano y conductor). Solo se pide si no lo ha dado.
- **Botón y gesto de regresar de Android:** cierra el menú u hoja abierta, regresa a la pantalla anterior, y en las pantallas principales manda la app al fondo sin cerrarla.
- Arreglo de zone.js: la pantalla ya se actualiza sola con las respuestas.

### Ciudadano
- **Elegir casa estilo Uber/DiDi:** mapa a pantalla completa con un pin fijo; mueve el mapa con el dedo y abajo aparece la calle. Se guarda con coordenadas y se puede cambiar después.
- **Mapa principal:** "Hola, {nombre}", su casa marcada y el camión en vivo ("El camión está a 95 m de tu casa · Unidad ECO-104"). Se actualiza cada 10 s.
- **Campana de avisos** con contador, banner y vibración. Pantalla "Avisos del camión".
- **Menú lateral** (toca tu inicial): Mis datos, Ubicación de mi casa, Avisos, Historial, Acerca de y Cerrar sesión.
- **Historial:** hoy, ayer y últimos 7 días, con "Pasó 07:47", "En camino" o "No pasó".

### Conductor (estilo chofer de DiDi)
- Mapa a pantalla completa con su **ruta del día** (línea verde por recorrer, gris lo ya recorrido) y **flecha** que gira hacia donde va.
- Arriba, en ruta: **"Vas por: {calle}"** y el indicador EN VIVO.
- Abajo:
  - Antes de salir: tarjeta con la ruta, el camión, los km y las colonias, y el botón grande **Iniciar ruta**.
  - En ruta: **% recorrido** y km que faltan, más los botones **Avisar vecinos**, **Reportar** (calle cerrada, falla mecánica, accidente) y **Terminar** (con confirmación).
- Manda su GPS cada 10 s mientras está en ruta. Si no hay señal, lo guarda y lo sincroniza después.
- Menú lateral: Mis datos, Ruta de hoy, Acerca de y Cerrar sesión.
- Si no tiene ruta, revisa cada 30 s y avisa "¡Tienes una nueva ruta asignada!".
- **Modo prueba: simular el recorrido.** Mueve el camión solo por la ruta para probar sin salir a la calle. Se quita para la versión final (`modoPrueba: false`).

---

## 5. APK (Capacitor)

- Proyecto Android en `frontend-movil/android`, paquete **`mx.gob.basurita.app`** (el mismo que está registrado en Firebase).
- Plugins: `@capacitor/push-notifications` y `@capacitor/app` (botón regresar).
- Ícono y pantalla de arranque con el logo de Basurita.
- Permisos: ubicación, notificaciones e internet.
- `google-services.json` ya está en `android/app/` (fuera de git).
- Construir: `cd frontend-movil; npm run apk`. El resultado queda en `android/app/build/outputs/apk/debug/app-debug.apk`.
- La APK apunta a `http://192.168.0.4:8000/api`, la IP de la PC (archivo `src/environments/environment.apk.ts`). Solo funciona en el mismo Wi-Fi, con el backend corriendo con `php artisan serve --host=0.0.0.0`.

---

## 6. Panel web (administrador)

- **Monitor global:** indicadores reales (unidades en ruta, rutas de hoy, incidencias abiertas, ciudadanos y operadores), **gráfica de estatus de unidades** (barra con 5 estados, colores aptos para daltónicos) y **mapa en vivo** de los camiones, centrado en Tecámac.
- **Asignar rutas (nuevo):** fecha, operador, camión y ruta, con vista previa del recorrido en un mapa. Lista de rutas del día con su estado; se pueden cancelar o eliminar.
- **Operadores (nuevo):** crear (nombre, correo, teléfono y contraseña con ojo), editar y eliminar. Con ese correo y contraseña entra el conductor a la app.
- Camiones, Incidencias y Reportes (Excel/PDF): se dejaron como estaban.
- Arreglos: íconos del menú lateral, menú en pantallas chicas, colores del tema que faltaban, y solo el administrador puede entrar al panel.

---

## 7. Cómo correrlo

Ver `README.md` (sección "Cómo correrlo para probar (3 terminales)"). En resumen:

| Terminal | Comando | Dónde |
|---|---|---|
| 1 Backend | `cd backend; php artisan serve` (para la APK: `--host=0.0.0.0`) | http://127.0.0.1:8000 |
| 2 Web admin | `cd frontend-web; npm start` | http://localhost:4200 |
| 3 Móvil (navegador) | `cd frontend-movil; npm start` | https://localhost:4300 o https://IP:4300 |

Los usuarios de prueba (admin, conductores y ciudadana) están en el `README.md`.

---

## 8. Pendientes

| Pendiente | Detalle |
|---|---|
| Subir a GitHub y abrir PR | Falta que te den permiso de escritura en `kawuay1999/basurita` |
| Clave de Firebase del backend | Firebase → Configuración → Cuentas de servicio → Generar clave privada; guardarla en `backend/storage/app/private/firebase/service-account.json` (secreta, no subir a git) |
| Backend en internet (24/7) | Hosting (Laravel Cloud o Railway, por ejemplo). Después se cambia la URL en `environment.apk.ts` y la APK funciona en cualquier red |
| Dibujar recorridos desde el panel | Hoy solo existe la Ruta Sur de prueba (en el seeder) |
| Recuperar y cambiar contraseña | Pospuesto a propósito |
| Calendario o recordatorio para el ciudadano | Idea a futuro |
| Incidencias del ciudadano | Por definir |
| Más diseño y animaciones | Login y pantalla del conductor, a futuro |
| Google Maps | Opcional. Requiere una API key de Google Cloud con facturación; hoy se usa OpenStreetMap |
| Probar en celular real | GPS real del conductor, push con la app cerrada, botón regresar |
