# Basurita — Resumen de avances

Plataforma municipal para rastrear en tiempo real los camiones recolectores de basura en Tecámac, Estado de México.

Corte: 20 de noviembre de 2026. Rama de trabajo: `feat/apps-conectadas-conductor-apk`.

## 1. Avance general

**Avance estimado: 75 % del proyecto.** Los tres módulos (ciudadano, conductor y administrador) ya están conectados entre sí. El sistema funciona en internet y la app se instala como APK en Android. El 25 % restante es, sobre todo, pulir y dejarlo listo para uso real: dibujar rutas desde el panel, recuperar contraseña, migrar el servidor a un plan permanente y firmar la versión final de la app.

| Área | Avance | Estado |
|---|---|---|
| Backend (API Laravel) | 85 % | Funcional y publicado en internet |
| App del ciudadano | 85 % | Mapa en vivo, casa, avisos, calendario e historial |
| App del conductor | 80 % | Navegación de ruta, GPS en vivo, avisos y reportes |
| Panel del administrador | 70 % | Monitor, asignaciones, operadores, usuarios y calendario |
| APK y notificaciones push | 80 % | APK de prueba con Firebase funcionando |
| Servidor 24/7 | 60 % | En prueba gratis de Railway; falta plan permanente |

## 2. Arquitectura

| Parte | Tecnología | Para quién |
|---|---|---|
| backend/ | Laravel 13 (PHP 8.4), Sanctum (tokens), PostgreSQL en internet, SQLite local | API para todos |
| frontend-web/ | Angular 21, Tailwind 4, Leaflet | Administrador (panel web) |
| frontend-movil/ | Angular 21, Tailwind 4, Leaflet, Capacitor 8 | Ciudadano y conductor (APK Android) |

- Mapas con OpenStreetMap (gratis, sin llave). Direcciones con Nominatim.
- Notificaciones push con Firebase Cloud Messaging (API v1), proyecto `basurita-31cd9`.
- Servidor publicado en Railway: https://backend-production-a85cbd7d.up.railway.app
- Idioma español y zona horaria de México en todo el backend.

## 3. Estado inicial del proyecto

- Las interfaces no estaban conectadas al backend en varios puntos.
- Rutas con rol daban error 500 (middleware `role` sin registrar) y el monitoreo del admin fallaba.
- La app móvil no actualizaba la pantalla al recibir datos (faltaba zone.js).
- Todo dependía de la "colonia" del ciudadano, que los usuarios nuevos no tenían.
- El panel web tenía números falsos y no había forma de crear operadores ni asignar rutas.

## 4. App del ciudadano

- **Animación de inicio:** logo, nombre y barra de carga.
- **Registro con validaciones en vivo** (errores en rojo debajo de cada campo):
  - Nombre: solo letras, mínimo 3.
  - Correo: formato válido de cualquier proveedor (Gmail, Hotmail, Outlook, institucional). Avisa si falta la @ o la terminación y sugiere correcciones ("¿Quisiste decir juan@gmail.com?").
  - Teléfono: solo números, exactamente 10 dígitos, con contador.
  - Contraseña: mínimo 8, con mayúscula, minúscula y número. Lista de requisitos que se pone en verde.
- **Inicio de sesión** con ojito para ver la contraseña. Distingue "contraseña incorrecta" de "sin conexión" y acepta el correo con mayúsculas o espacios.
- **Permiso de ubicación** al entrar (solo si no se ha dado).
- **Elegir casa estilo Uber/DiDi:** se mueve el mapa con el dedo, el pin queda fijo y abajo aparece la calle. Se guardan coordenadas y dirección, y se puede cambiar después.
- **Mapa principal:** saludo, casa marcada y el camión en vivo ("El camión está a 95 m de tu casa"). Se actualiza cada 10 s.
- **Avisos:** campana con contador, banner con vibración y lista de avisos. Llegan como **notificación push aunque la app esté cerrada**.
- **Menú lateral:** Mis datos, Ubicación de mi casa, Avisos, Calendario de recolección, Acerca de y Cerrar sesión.
- **Calendario de recolección:**
  - Calendario grande del mes con los días de recolección en verde (los que publica el admin).
  - Palomita en los días en que el camión sí pasó (según el GPS real).
  - Tarjeta "Próxima recolección" y aviso del municipio.
- **Historial:** hoy, ayer y últimos 7 días, con la hora real en que pasó el camión por su calle.

## 5. App del conductor (estilo chofer de DiDi)

- Mapa a pantalla completa con la **ruta del día**: línea verde por recorrer, gris lo ya recorrido, y una flecha que gira hacia donde va.
- Arriba, en ruta: "Vas por: {calle}" e indicador EN VIVO.
- Abajo: tarjeta de la ruta y botón **Iniciar ruta**; en ruta, % recorrido, km que faltan y tres botones grandes.
- **Avisar vecinos** (un toque):
  - "Ya voy pasando" llega a vecinos a menos de 600 m.
  - "Ya inicié el recorrido", "Voy con retraso" y "Hoy no podré pasar" llegan a toda la ruta.
  - El mismo aviso no se repite antes de 3 minutos.
- **Reportar** (lista minimalista con íconos): calle cerrada, falla mecánica, accidente, camión lleno, mal clima u otro problema. El admin lo ve al momento.
- **Terminar ruta** con confirmación.
- GPS enviado cada 10 s; sin señal, se guarda en el celular y se sincroniza después.
- Revisa cada 30 s si le asignaron ruta y le llega push "Tienes una nueva ruta".
- Menú propio: Mis datos, Ruta de hoy, Acerca de y Cerrar sesión.
- **Modo prueba:** botón "Simular el recorrido" para probar sin salir a la calle (se quita en la versión final).

## 6. Panel del administrador (web)

- **Monitor global:** indicadores reales y mapa en vivo de los camiones.
  - Indicadores: unidades en ruta, rutas de hoy, incidencias abiertas, ciudadanos y operadores.
  - **Gráfica de estatus de unidades:** en ruta, programado, disponible, mantenimiento y baja, con colores aptos para daltónicos.
- **Asignar rutas:** fecha, operador, camión y ruta, con vista previa del recorrido. Impide repetir operador o camión el mismo día; se pueden cancelar o eliminar.
- **Operadores:** crear, editar y eliminar. No deja borrar a un operador con ruta activa.
- **Usuarios (nuevo):**
  - **Ciudadanos:** lista con buscador, casa, teléfono y fecha de alta. Se puede crear, editar, **cambiar contraseña** (le cierra la sesión en su celular) y eliminar.
  - **Calendario de recolección:** el admin elige mes y ruta (o todas) y publica qué días pasa el camión. Puede ser días pares, impares, ciertos días de la semana (por ejemplo, lunes y jueves) o días elegidos a mano, con vista previa y un mensaje para los vecinos.
- **Camiones, Incidencias y Reportes** (exportar a Excel y PDF).
- Modo nube: `npm run start:nube` usa el mismo servidor de internet que la APK.

## 7. Backend: API principal

Todas las rutas empiezan con `/api/v1`. Las protegidas usan token (Sanctum) y rol.

| Rol | Rutas principales |
|---|---|
| Público | POST /auth/register, POST /auth/login, GET /avisos/publicos, GET /colonias/activas |
| Cualquiera con sesión | GET/PUT /perfil, POST /fcm-token, POST /auth/logout |
| Ciudadano | PUT /ciudadano/casa, GET /ciudadano/camion-cercano, GET /ciudadano/historial, GET /ciudadano/calendario, GET /ciudadano/notificaciones |
| Conductor | GET /operador/jornada-hoy, POST iniciar-ruta / finalizar-ruta, POST /operador/gps, POST /operador/avisar-vecinos, POST /operador/incidencias, POST /operador/sincronizar |
| Administrador | /admin/dashboard, /admin/operadores, /admin/usuarios, /admin/jornadas, /admin/rutas, /admin/calendarios, /admin/camiones, /admin/incidencias, /admin/reportes, /admin/monitoreo/activos |

**Tablas nuevas o modificadas:**
- `users.direccion_casa`.
- `rutas.recorrido`: puntos del recorrido por calles reales.
- `calendarios_recoleccion`: mes, ruta, modo, días y nota.

**Servicios clave:**
- `FcmService`: notificaciones push.
- `VecinosRutaService`: qué casas quedan sobre una ruta.
- `GeocercaService`: aviso automático "el camión está cerca".
- `Geo`: cálculo de distancias.

## 8. APK y notificaciones

- Capacitor 8, paquete `mx.gob.basurita.app`, con ícono y pantalla de arranque de Basurita.
- La APK apunta al servidor de internet: funciona con datos móviles, sin la PC prendida.
- Botón y gesto de regresar de Android: cierran menús o regresan de pantalla, sin cerrar la app.
- Notificaciones push en el canal "Avisos del camión", de prioridad alta (salen arriba, con sonido y vibración), aunque la app esté cerrada.
- Se genera con `cd frontend-movil; npm run apk`. Resultado: `android/app/build/outputs/apk/debug/app-debug.apk`.

## 9. Servidor en internet (Railway)

- Proyecto `basurita` con dos servicios: `backend` y `Postgres`.
- En cada despliegue corre las migraciones y el seeder (el seeder no duplica datos).
- Las variables secretas (APP_KEY, base de datos, clave de Firebase) solo viven en Railway; nunca se suben a GitHub.
- Subir cambios: `cd backend; railway up --service backend`. Ver errores: `railway logs --service backend`.
- **Costo:** prueba gratis de 30 días (vence alrededor del 19 de diciembre de 2026). Plan acordado: migrar a Heroku con el crédito del GitHub Student Developer Pack (13 USD al mes por 24 meses), con recordatorio agendado para el 10 de diciembre.

## 10. Cómo correrlo en la PC

| Terminal | Comando | Dónde |
|---|---|---|
| Backend | cd backend; php artisan serve (para la APK local: --host=0.0.0.0) | http://127.0.0.1:8000 |
| Panel web | cd frontend-web; npm start (o npm run start:nube) | http://localhost:4200 |
| App móvil (navegador) | cd frontend-movil; npm start | https://localhost:4300 |

Los usuarios de prueba (admin, conductores y ciudadana) están en el `README.md`.

## 11. Riesgos y puntos de atención

- **Vencimiento del servidor:** si no se migra antes del 19 de diciembre de 2026, Railway apaga el servidor y la APK deja de funcionar.
- **Secretos:** la clave de Firebase (`service-account.json`) y el `.env` no deben compartirse ni subirse. Si se filtran, hay que regenerarlos.
- **APK de prueba:** está firmada en modo debug e incluye el modo prueba. Para entregarla a usuarios reales hay que generar una versión firmada (release) con `modoPrueba: false`.
- **Recorridos de rutas:** hoy solo existe la Ruta Sur de prueba. Hasta que el admin pueda dibujarlas, no se puede garantizar que todas las casas queden cubiertas.
- **Límites de servicios gratuitos:** Nominatim (direcciones) y los mosaicos de OpenStreetMap limitan el uso intensivo. Con muchos usuarios convendría un proveedor de mapas propio o de pago.
- **Precisión del GPS:** depende del celular del conductor y de la señal. Con señal débil los datos llegan con retraso (se guardan y se sincronizan después).
- **Datos de prueba:** el seeder crea una jornada "en curso" de ejemplo; en producción conviene no cargar datos de prueba.
- **Sin pruebas automatizadas:** las funciones se probaron a mano. Antes de crecer conviene agregar pruebas.

## 12. Pendientes y siguientes pasos

| Pendiente | Detalle |
|---|---|
| Migrar a Heroku | Antes del 19 dic 2026, con el Student Pack |
| Dibujar rutas en el panel | Pines en el mapa que trazan el camino por calles reales |
| Mapa de cobertura | Casas cubiertas en verde y casas sin ruta en rojo |
| Recuperar y cambiar contraseña | Por correo, desde la app |
| APK final firmada | Versión release, sin modo prueba |
| Camiones e incidencias | Revisar que todas sus pantallas usen solo datos reales |
| Pruebas | Probar en varios celulares con GPS real y agregar pruebas automatizadas |
| Diseño | Más animaciones y pulido visual en login y pantallas del conductor |
