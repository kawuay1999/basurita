<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class BasuritaDemoSeeder extends Seeder
{
    public function run(): void
    {
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