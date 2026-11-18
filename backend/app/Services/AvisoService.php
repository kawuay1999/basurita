<?php

namespace App\Services;

use App\Models\Aviso;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class AvisoService
{
    // [ADMIN] Lista todo
    public function getAllAvisos(): Collection
    {
        return Aviso::orderBy('created_at', 'desc')->get();
    }

    // [CIUDADANO] Lista solo los activos y no expirados
    public function getAvisosPublicos(): Collection
    {
        return Aviso::where('activo', true)
            ->where(function ($query) {
                $query->whereNull('fecha_expiracion')
                      ->orWhere('fecha_expiracion', '>', Carbon::now());
            })
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function createAviso(array $data): Aviso
    {
        return Aviso::create($data);
    }

    public function updateAviso(Aviso $aviso, array $data): Aviso
    {
        $aviso->update($data);
        return $aviso;
    }

    public function deleteAviso(Aviso $aviso): void
    {
        $aviso->delete();
    }
}