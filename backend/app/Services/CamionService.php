<?php

namespace App\Services;

use App\Models\Camion;
use Illuminate\Database\Eloquent\Collection;

class CamionService
{
    public function getAllCamiones(): Collection
    {
        return Camion::orderBy('numero_economico', 'asc')->get();
    }

    public function getActiveCamiones(): Collection
    {
        return Camion::where('estado', 'activo')->orderBy('numero_economico', 'asc')->get();
    }

    public function createCamion(array $data): Camion
    {
        return Camion::create([
            'numero_economico' => $data['numero_economico'],
            'placa' => strtoupper($data['placa']), // Normalizamos las placas a mayúsculas
            'capacidad_toneladas' => $data['capacidad_toneladas'] ?? null,
            'estado' => $data['estado'] ?? 'activo',
        ]);
    }

    public function updateCamion(Camion $camion, array $data): Camion
    {
        if (isset($data['placa'])) {
            $data['placa'] = strtoupper($data['placa']);
        }
        
        $camion->update($data);
        return $camion;
    }

    public function deleteCamion(Camion $camion): void
    {
        // Regla de negocio: En lugar de borrar físicamente si tiene historial, 
        // lo pasamos a "inactivo". Por ahora, si es nuevo, lo borramos.
        // *Nota: Cuando hagamos el Módulo 6, validaremos si el camión tiene jornadas registradas.*
        
        $camion->delete();
    }
}