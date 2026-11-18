<?php

namespace App\Services;

use App\Models\Ruta;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class RutaService
{
    public function getAllRutas(): Collection
    {
        // Traemos las rutas con sus relaciones cargadas para el panel de administración
        return Ruta::with(['colonias', 'horarios'])->orderBy('nombre', 'asc')->get();
    }

    public function createRuta(array $data): Ruta
    {
        // Usamos una transacción: Si falla asignar colonias u horarios, la ruta no se crea a medias
        return DB::transaction(function () use ($data) {
            
            $ruta = Ruta::create([
                'nombre' => $data['nombre'],
                'descripcion' => $data['descripcion'] ?? null,
                'activa' => $data['activa'] ?? true,
            ]);

            // Asociar colonias (arreglo de IDs)
            if (!empty($data['colonias'])) {
                $ruta->colonias()->sync($data['colonias']);
            }

            // Crear horarios
            if (!empty($data['horarios'])) {
                $ruta->horarios()->createMany($data['horarios']);
            }

            return $ruta->load(['colonias', 'horarios']);
        });
    }

    public function updateRuta(Ruta $ruta, array $data): Ruta
    {
        return DB::transaction(function () use ($ruta, $data) {
            
            $ruta->update([
                'nombre' => $data['nombre'] ?? $ruta->nombre,
                'descripcion' => $data['descripcion'] ?? $ruta->descripcion,
                'activa' => $data['activa'] ?? $ruta->activa,
            ]);

            if (isset($data['colonias'])) {
                $ruta->colonias()->sync($data['colonias']); // sync borra las viejas y pone las nuevas
            }

            if (isset($data['horarios'])) {
                // Borramos los horarios viejos y creamos los nuevos para mantenerlo simple
                $ruta->horarios()->delete();
                $ruta->horarios()->createMany($data['horarios']);
            }

            return $ruta->load(['colonias', 'horarios']);
        });
    }

    public function deleteRuta(Ruta $ruta): void
    {
        DB::transaction(function () use ($ruta) {
            // Elimina horarios y la relación pivote automáticamente por el cascadeOnDelete de la BD,
            // pero lo forzamos por buenas prácticas de Eloquent.
            $ruta->horarios()->delete();
            $ruta->colonias()->detach();
            $ruta->delete();
        });
    }
}