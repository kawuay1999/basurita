<?php

namespace App\Services;

use App\Models\Incidencia;
use App\Models\Jornada;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class IncidenciaService
{
    // [ADMIN] Listar todas las incidencias (generalmente ordenadas por las más recientes y no resueltas)
    public function getAllIncidencias(): Collection
    {
        return Incidencia::with(['jornada.operador', 'jornada.camion', 'jornada.ruta'])
            ->orderByRaw("CASE WHEN estado = 'nueva' THEN 1 WHEN estado = 'en_atencion' THEN 2 ELSE 3 END")
            ->orderBy('created_at', 'desc')
            ->get();
    }

    // [ADMIN] Cambiar el estado del reporte
    public function actualizarEstado(Incidencia $incidencia, string $nuevoEstado): Incidencia
    {
        $incidencia->update(['estado' => $nuevoEstado]);
        return $incidencia->load(['jornada.operador', 'jornada.camion']);
    }

    // [OPERADOR] Crear un reporte desde la calle
    public function reportarIncidencia(int $operadorId, array $data, $foto = null): Incidencia
    {
        // 1. Buscar la jornada activa del operador de hoy
        $jornada = Jornada::where('operador_id', $operadorId)
            ->whereDate('fecha', Carbon::today())
            ->where('estado', 'en_curso')
            ->first();

        if (!$jornada) {
            throw ValidationException::withMessages([
                'jornada' => ['Debes tener una ruta en curso para poder reportar una incidencia operativa.']
            ]);
        }

        // 2. Procesar la foto si el operador adjuntó una
        $fotoPath = null;
        if ($foto) {
            // Se guardará en storage/app/public/incidencias
            $fotoPath = $foto->store('incidencias', 'public'); 
        }

        // 3. Crear el registro
        return Incidencia::create([
            'jornada_id' => $jornada->id,
            'tipo' => $data['tipo'],
            'descripcion' => $data['descripcion'] ?? null,
            'foto_path' => $fotoPath,
            'estado' => 'nueva'
        ]);
    }
}