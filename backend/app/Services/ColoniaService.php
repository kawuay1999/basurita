<?php

namespace App\Services;

use App\Models\Colonia;
use Illuminate\Database\Eloquent\Collection;

class ColoniaService
{
    // Obtiene todas las colonias (Para el Admin)
    public function getAllColonias(): Collection
    {
        return Colonia::orderBy('nombre', 'asc')->get();
    }

    // Obtiene solo las activas (Para el Ciudadano)
    public function getActiveColonias(): Collection
    {
        return Colonia::where('activa', true)->orderBy('nombre', 'asc')->get();
    }

    public function createColonia(array $data): Colonia
    {
        return Colonia::create([
            'nombre' => $data['nombre'],
            'zona_o_sector' => $data['zona_o_sector'] ?? null,
            'codigo_postal' => $data['codigo_postal'] ?? null,
            'activa' => $data['activa'] ?? true,
        ]);
    }

    public function updateColonia(Colonia $colonia, array $data): Colonia
    {
        $colonia->update($data);
        return $colonia;
    }

    public function deleteColonia(Colonia $colonia): void
    {
        // No borramos la colonia si hay usuarios asignados (Regla de integridad)
        if ($colonia->usuarios()->count() > 0) {
            throw new \Exception('No se puede eliminar la colonia porque tiene ciudadanos registrados. Desactívela en su lugar.');
        }
        $colonia->delete();
    }
}