<?php

namespace App\Services;

use App\Models\Jornada;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class JornadaService
{
    // Administrador: Ver todas las jornadas (con sus relaciones)
    public function getAllJornadas(): Collection
    {
        return Jornada::with(['operador', 'camion', 'ruta'])
            ->orderBy('fecha', 'desc')
            ->get();
    }

    // Operador: Ver qué le toca hacer el día de hoy
    public function getJornadaDeHoy(int $operadorId): ?Jornada
    {
        return Jornada::with(['camion', 'ruta.colonias'])
            ->where('operador_id', $operadorId)
            ->whereDate('fecha', Carbon::today())
            ->whereIn('estado', ['programada', 'en_curso'])
            ->first();
    }

    public function createJornada(array $data): Jornada
    {
        // Validar que el usuario sea realmente un operador
        $operador = User::find($data['operador_id']);
        if ($operador->role !== 'operador') {
            throw ValidationException::withMessages([
                'operador_id' => ['El usuario seleccionado no tiene el rol de operador.']
            ]);
        }

        // Regla: Evitar que un operador sea asignado a dos rutas el mismo día (si no está finalizada/cancelada)
        $existe = Jornada::where('operador_id', $data['operador_id'])
            ->where('fecha', $data['fecha'])
            ->whereIn('estado', ['programada', 'en_curso'])
            ->exists();

        if ($existe) {
            throw ValidationException::withMessages([
                'operador_id' => ['Este operador ya tiene una jornada activa programada para esta fecha.']
            ]);
        }

        // Regla: un camión no puede estar en dos rutas activas el mismo día
        $camionOcupado = Jornada::where('camion_id', $data['camion_id'])
            ->whereDate('fecha', $data['fecha'])
            ->whereIn('estado', ['programada', 'en_curso'])
            ->exists();

        if ($camionOcupado) {
            throw ValidationException::withMessages([
                'camion_id' => ['Este camión ya está asignado a otra ruta activa en esa fecha.']
            ]);
        }

        $jornada = Jornada::create([
            'operador_id' => $data['operador_id'],
            'camion_id' => $data['camion_id'],
            'ruta_id' => $data['ruta_id'],
            'fecha' => $data['fecha'],
            'estado' => $data['estado'] ?? 'programada',
        ])->load(['operador', 'camion', 'ruta']);

        // Aviso al celular del conductor (si tiene la APK y Firebase está configurado)
        $fecha = Carbon::parse($data['fecha']);
        $cuando = $fecha->isToday() ? 'hoy' : 'el ' . $fecha->locale('es')->isoFormat('dddd D [de] MMMM');
        app(FcmService::class)->enviarA(
            $operador,
            'Tienes una nueva ruta',
            "{$jornada->ruta->nombre} {$cuando} con el camión {$jornada->camion->numero_economico}.",
            ['tipo' => 'nueva_ruta']
        );

        return $jornada;
    }

    public function updateJornada(Jornada $jornada, array $data): Jornada
    {
        $jornada->update($data);
        return $jornada->load(['operador', 'camion', 'ruta']);
    }

    public function deleteJornada(Jornada $jornada): void
    {
        // Regla: No borrar si ya está en curso (el GPS o historial quedaría huérfano)
        if ($jornada->estado === 'en_curso') {
            throw ValidationException::withMessages([
                'estado' => ['No se puede eliminar una jornada que está en curso. Cancélela en su lugar.']
            ]);
        }
        $jornada->delete();
    }
}