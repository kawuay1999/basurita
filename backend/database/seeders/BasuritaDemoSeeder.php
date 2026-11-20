<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class BasuritaDemoSeeder extends Seeder
{
    /** Recorrido de prueba de la Ruta Sur, trazado sobre calles reales. */
    private const RECORRIDO_RUTA_SUR = [
        [19.655772, -99.016044], [19.655927, -99.016946], [19.655684, -99.016974], [19.655608, -99.016903],
        [19.65543, -99.015943], [19.655297, -99.015698], [19.655105, -99.014553], [19.655059, -99.014221],
        [19.655081, -99.014174], [19.654925, -99.013752], [19.654374, -99.013897], [19.65395, -99.013184],
        [19.654571, -99.013044], [19.65395, -99.013184], [19.653634, -99.012622], [19.653908, -99.012563],
        [19.655169, -99.012292], [19.654755, -99.011586], [19.654446, -99.011397], [19.654353, -99.011276],
        [19.653817, -99.010193], [19.653727, -99.010074], [19.653172, -99.010829], [19.652886, -99.011025],
        [19.652342, -99.010105], [19.652066, -99.009638], [19.652256, -99.00954], [19.654324, -99.009284],
        [19.653654, -99.008096], [19.653957, -99.008026],
    ];

    public function run(): void
    {
        // Se puede correr en cada despliegue: si los datos de prueba ya existen, no duplica nada
        $admin = DB::table('users')->where('email', 'admin@basurita.gob.mx')->first();
        if ($admin && $admin->role === 'administrador') {
            $this->command?->info('Datos de prueba ya cargados; no se vuelven a crear.');
            return;
        }

        // Si alguien registró antes uno de los correos de prueba (por ejemplo, el del admin
        // como ciudadano), se borra para crear la cuenta de prueba correcta
        DB::table('users')->whereIn('email', [
            'admin@basurita.gob.mx', 'operador@basurita.gob.mx', 'ciudadano@basurita.gob.mx',
            'ana.ciudadana@basurita.test', 'jorge.conductor@basurita.test',
        ])->delete();

        DB::transaction(function () {
            $ahora = Carbon::now();

            // 1. Colonias reales de ejemplo
            $coloniaCentroId = DB::table('colonias')->insertGetId([
                'nombre' => 'Tecámac Centro',
                'codigo_postal' => '55740',
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);

            $coloniaHeroesId = DB::table('colonias')->insertGetId([
                'nombre' => 'Los Héroes Tecámac Sexta Sección',
                'codigo_postal' => '55764',
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);

            $coloniaOjoAguaId = DB::table('colonias')->insertGetId([
                'nombre' => 'Ojo de Agua',
                'codigo_postal' => '55770',
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);

            // 2. Usuarios de prueba por rol (1 Admin, 1 Operador, 1 Ciudadano)
            DB::table('users')->insert([
                [
                    'name' => 'Carlos Mendoza (Admin)',
                    'email' => 'admin@basurita.gob.mx',
                    'password' => Hash::make('Admin2026*'),
                    'telefono' => '5510203040',
                    'role' => 'administrador',
                    'colonia_id' => $coloniaCentroId,
                    'latitud_casa' => null,
                    'longitud_casa' => null,
                    'radio_notificacion_metros' => null,
                    'created_at' => $ahora,
                    'updated_at' => $ahora,
                ],
                [
                    'name' => 'Roberto Hernández (Operador)',
                    'email' => 'operador@basurita.gob.mx',
                    'password' => Hash::make('Operador2026*'),
                    'telefono' => '5520304050',
                    'role' => 'operador',
                    'colonia_id' => $coloniaCentroId,
                    'latitud_casa' => null,
                    'longitud_casa' => null,
                    'radio_notificacion_metros' => null,
                    'created_at' => $ahora,
                    'updated_at' => $ahora,
                ],
                [
                    'name' => 'Laura Sánchez (Ciudadano)',
                    'email' => 'ciudadano@basurita.gob.mx',
                    'password' => Hash::make('Ciudadano2026*'),
                    'telefono' => '5530405060',
                    'role' => 'ciudadano',
                    'colonia_id' => $coloniaHeroesId,
                    'latitud_casa' => 19.6542100,
                    'longitud_casa' => -99.0124500,
                    'radio_notificacion_metros' => 350,
                    'created_at' => $ahora,
                    'updated_at' => $ahora,
                ],
                // Usuarios extra de prueba (ciudadano registrado y conductor dado de alta por admin)
                [
                    'name' => 'Ana Ciudadana Prueba',
                    'email' => 'ana.ciudadana@basurita.test',
                    'password' => Hash::make('Ciudadana2026*'),
                    'telefono' => '5511112222',
                    'role' => 'ciudadano',
                    'colonia_id' => $coloniaHeroesId,
                    'latitud_casa' => null,
                    'longitud_casa' => null,
                    'radio_notificacion_metros' => 350,
                    'created_at' => $ahora,
                    'updated_at' => $ahora,
                ],
                [
                    'name' => 'Jorge Conductor Prueba',
                    'email' => 'jorge.conductor@basurita.test',
                    'password' => Hash::make('Conductor2026*'),
                    'telefono' => '5533334444',
                    'role' => 'operador',
                    'colonia_id' => null,
                    'latitud_casa' => null,
                    'longitud_casa' => null,
                    'radio_notificacion_metros' => null,
                    'created_at' => $ahora,
                    'updated_at' => $ahora,
                ],
            ]);

            $operadorId = DB::table('users')->where('email', 'operador@basurita.gob.mx')->value('id');

            // 3. Camiones recolectores
            $camionActivoId = DB::table('camiones')->insertGetId([
                'placa' => 'LZF-458-A',
                'numero_economico' => 'ECO-104',
                'capacidad_toneladas' => 12.50,
                'estado' => 'activo',
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);

            DB::table('camiones')->insert([
                'placa' => 'MNC-892-B',
                'numero_economico' => 'ECO-108',
                'capacidad_toneladas' => 10.00,
                'estado' => 'activo',
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);

            // 4. Rutas y relación con colonias
            $rutaSurId = DB::table('rutas')->insertGetId([
                'nombre' => 'Ruta Sur - Héroes y Ojo de Agua',
                'descripcion' => 'Recolección matutina sector residencial sur',
                // Recorrido por calles reales de Los Héroes Tecámac (puntos [lat, lng])
                'recorrido' => json_encode(self::RECORRIDO_RUTA_SUR),
                'activa' => true,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);

            DB::table('colonia_ruta')->insert([
                ['ruta_id' => $rutaSurId, 'colonia_id' =>$coloniaHeroesId],
                ['ruta_id' => $rutaSurId, 'colonia_id' =>$coloniaOjoAguaId],
            ]);

            // 5. Horario programado
            DB::table('horarios')->insert([
                'ruta_id' => $rutaSurId,
                'dia_semana' => strtolower($ahora->locale('es')->dayName),
                'hora_inicio' => '07:00:00',
                'hora_fin' => '14:00:00',
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);

            // 6. Jornada activa de hoy + Ubicación GPS inicial + Incidencia de ejemplo
            $jornadaId = DB::table('jornadas')->insertGetId([
                'ruta_id' => $rutaSurId,
                'camion_id' => $camionActivoId,
                'operador_id' => $operadorId,
                'fecha' => $ahora->toDateString(),
                'estado' => 'en_curso',
                'created_at' => $ahora->copy()->subHours(2), 'updated_at' =>$ahora,
            ]);

            DB::table('ubicaciones')->insert([
                'jornada_id' => $jornadaId,
                'latitud' => 19.6548000,
                'longitud' => -99.0131000,
                'precision_metros' => 8.5,
                'fecha_hora_dispositivo' => $ahora,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);

            DB::table('incidencias')->insert([
                'jornada_id' => $jornadaId,
                'tipo' => 'calle_cerrada',
                'descripcion' => 'Mantenimiento de red hidráulica en Av. Bosques; unidad tomando desvío alterno.',
                'estado' => 'nueva',
                'created_at' => $ahora->copy()->subMinutes(25), 'updated_at' =>$ahora->copy()->subMinutes(25),
            ]);
        });
    }
}