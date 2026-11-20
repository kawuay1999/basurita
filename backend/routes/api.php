<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ColoniaController;
use App\Http\Controllers\Api\V1\CamionController;
use App\Http\Controllers\Api\V1\OperadorController;
use App\Http\Controllers\Api\V1\RutaController;
use App\Http\Controllers\Api\V1\JornadaController;
use App\Http\Controllers\Api\V1\MapaAdminController;
use App\Http\Controllers\Api\V1\MapaCiudadanoController;
use App\Http\Controllers\Api\V1\CalendarioCiudadanoController;
use App\Http\Controllers\Api\V1\NotificacionController;
use App\Http\Controllers\Api\V1\IncidenciaController;
use App\Http\Controllers\Api\V1\AvisoController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\GpsController;
use App\Http\Controllers\Api\V1\UbicacionController;
use App\Http\Controllers\Api\V1\RutaColoniaController;
use App\Http\Controllers\Api\V1\SyncController;
use App\Http\Controllers\Api\V1\ReporteHistorialController;
use App\Http\Controllers\Api\V1\CiudadanoController;
use App\Http\Controllers\Api\V1\PerfilController;
use App\Http\Controllers\Api\V1\AvisoVecinosController;
use App\Http\Controllers\Api\V1\CalendarioAdminController;
use App\Http\Controllers\Api\V1\UsuarioAdminController;

Route::prefix('v1')->group(function () {

    // ==========================================
    // RUTAS PÚBLICAS (No requieren token)
    // ==========================================
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);

    // Horarios, Calendario y Mapa Público
    Route::get('/ciudadano/colonias/{coloniaId}/horarios', [CalendarioCiudadanoController::class, 'horarios']);
    Route::get('/ciudadano/colonias/{coloniaId}/calendario', [CalendarioCiudadanoController::class, 'calendario']);
    Route::get('/ciudadano/colonias/{coloniaId}/mapa', [MapaCiudadanoController::class, 'getUbicaciones']);

    // Colonias y Avisos Públicos
    Route::get('/colonias/activas', [ColoniaController::class, 'activas']);
    Route::get('/avisos/publicos', [AvisoController::class, 'publicos']);

    // ==========================================
    // RUTAS PROTEGIDAS (Requieren Token Sanctum)
    // ==========================================
    Route::middleware('auth:sanctum')->group(function () {

        // Cierre de sesión y notificaciones push
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Mis datos (cualquier rol)
        Route::get('/perfil', [PerfilController::class, 'mostrar']);
        Route::put('/perfil', [PerfilController::class, 'actualizar']);
        // Token del celular para notificaciones push (ciudadano y conductor)
        Route::post('/fcm-token', [NotificacionController::class, 'registrarFcmToken']);
        Route::post('/notificaciones/proximidad', [RutaColoniaController::class, 'enviarPushProximidad']);

        // ------------------------------------------
        // EXCLUSIVAS DE ADMINISTRADOR
        // ------------------------------------------
        Route::middleware('role:administrador')->group(function () {
            Route::get('/admin/dashboard', [DashboardController::class, 'index']);

            // CRUD de Avisos oficiales
            Route::get('/admin/avisos', [AvisoController::class, 'index']);
            Route::post('/admin/avisos', [AvisoController::class, 'store']);
            Route::put('/admin/avisos/{aviso}', [AvisoController::class, 'update']);
            Route::delete('/admin/avisos/{aviso}', [AvisoController::class, 'destroy']);

            // CRUD de Colonias
            Route::get('/admin/colonias', [ColoniaController::class, 'index']);
            Route::post('/admin/colonias', [ColoniaController::class, 'store']);
            Route::put('/admin/colonias/{colonia}', [ColoniaController::class, 'update']);
            Route::delete('/admin/colonias/{colonia}', [ColoniaController::class, 'destroy']);

            // CRUD de Camiones
            Route::get('/admin/camiones', [CamionController::class, 'index']);
            Route::get('/admin/camiones/activos', [CamionController::class, 'activos']);
            Route::post('/admin/camiones', [CamionController::class, 'store']);
            Route::put('/admin/camiones/{camion}', [CamionController::class, 'update']);
            Route::delete('/admin/camiones/{camion}', [CamionController::class, 'destroy']);

            // CRUD de Operadores
            Route::get('/admin/operadores', [OperadorController::class, 'index']);
            Route::post('/admin/operadores', [OperadorController::class, 'store']);
            Route::put('/admin/operadores/{operador}', [OperadorController::class, 'update']);
            Route::delete('/admin/operadores/{operador}', [OperadorController::class, 'destroy']);

            // CRUD de Rutas y Horarios
            Route::get('/admin/rutas', [RutaController::class, 'index']);
            Route::post('/admin/rutas', [RutaController::class, 'store']);
            Route::put('/admin/rutas/{ruta}', [RutaController::class, 'update']);
            Route::delete('/admin/rutas/{ruta}', [RutaController::class, 'destroy']);

            // CRUD de Asignaciones / Jornadas
            Route::get('/admin/jornadas', [JornadaController::class, 'index']);
            Route::post('/admin/jornadas', [JornadaController::class, 'store']);
            Route::put('/admin/jornadas/{jornada}', [JornadaController::class, 'update']);
            Route::delete('/admin/jornadas/{jornada}', [JornadaController::class, 'destroy']);

            // Mapa en Tiempo Real, Incidencias y Reportes
            Route::get('/admin/mapa/ubicaciones', [MapaAdminController::class, 'getUbicaciones']);
            Route::get('/admin/incidencias', [IncidenciaController::class, 'index']);
            Route::put('/admin/incidencias/{incidencia}/estado', [IncidenciaController::class, 'updateEstado']);
            Route::get('/admin/reportes', [ReporteHistorialController::class, 'reporteAdmin']);

            // Usuarios (ciudadanos) y calendario de recolección
            Route::get('/admin/usuarios', [UsuarioAdminController::class, 'index']);
            Route::post('/admin/usuarios', [UsuarioAdminController::class, 'store']);
            Route::put('/admin/usuarios/{usuario}', [UsuarioAdminController::class, 'update']);
            Route::delete('/admin/usuarios/{usuario}', [UsuarioAdminController::class, 'destroy']);
            Route::get('/admin/calendarios', [CalendarioAdminController::class, 'index']);
            Route::post('/admin/calendarios', [CalendarioAdminController::class, 'guardar']);
            Route::delete('/admin/calendarios/{calendario}', [CalendarioAdminController::class, 'eliminar']);
            // Mapa y Monitoreo en Tiempo Real (Exclusivo Administrador)
            Route::get('/admin/monitoreo/activos', [MapaAdminController::class, 'getUbicaciones']);
        });

        // ------------------------------------------
        // EXCLUSIVAS DE OPERADOR
        // ------------------------------------------
        Route::middleware('role:operador')->group(function () {
            Route::get('/operador/jornada-hoy', [JornadaController::class, 'miJornadaHoy']);
            Route::post('/operador/iniciar-ruta', [JornadaController::class, 'iniciarRuta']);
            Route::post('/operador/finalizar-ruta', [JornadaController::class, 'finalizarRuta']);

            // Transmisión GPS (Revisa si usas UbicacionController o GpsController)
            Route::post('/operador/gps', [GpsController::class, 'registrarUbicacion']);

            // Incidencias y Sincronización Offline
            Route::post('/operador/incidencias', [IncidenciaController::class, 'store']);
            Route::post('/operador/sincronizar', [SyncController::class, 'sincronizarOperador']);

            // Avisos rápidos del conductor a los vecinos de su ruta
            Route::post('/operador/avisar-vecinos', [AvisoVecinosController::class, 'enviar']);
        });

        // ------------------------------------------
        // EXCLUSIVAS DE CIUDADANO (Y Admin)
        // ------------------------------------------
        Route::middleware('role:ciudadano,administrador')->group(function () {
            // Perfil, casa y camión más cercano a la casa
            Route::get('/ciudadano/perfil', [CiudadanoController::class, 'perfil']);
            Route::put('/ciudadano/perfil', [CiudadanoController::class, 'actualizarPerfil']);
            Route::put('/ciudadano/casa', [CiudadanoController::class, 'guardarCasa']);
            Route::get('/ciudadano/camion-cercano', [CiudadanoController::class, 'camionCercano']);
            Route::get('/ciudadano/historial', [CiudadanoController::class, 'historial']);
            Route::get('/ciudadano/calendario', [CiudadanoController::class, 'calendario']);

            Route::get('/ciudadano/notificaciones', [NotificacionController::class, 'index']);
            Route::put('/ciudadano/notificaciones/{id}/leer', [NotificacionController::class, 'marcarLeida']);
            Route::post('/ciudadano/fcm-token', [NotificacionController::class, 'registrarFcmToken']);

            // Seguimiento de colonia e historial
            Route::get('/colonias/{coloniaId}/estado-ruta', [RutaColoniaController::class, 'estadoPorColonia']);
            Route::get('/gps/colonia/{coloniaId}/camion', [GpsController::class, 'obtenerUbicacionPorColonia']);
            Route::get('/colonias/{coloniaId}/historial', [ReporteHistorialController::class, 'historialCiudadano']);
        });
    });
});