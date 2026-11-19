<?php

namespace App\Services;

use App\Models\Jornada;
use App\Models\User;
use App\Support\Geo;
use Illuminate\Support\Collection;

/**
 * Encuentra a los ciudadanos que viven sobre la ruta de una jornada,
 * usando la ubicación de su casa (no depende de la colonia).
 */
class VecinosRutaService
{
    // Una casa "está en la ruta" si queda a esta distancia o menos del recorrido
    const METROS_DEL_RECORRIDO = 300;
    // Si la ruta aún no tiene recorrido dibujado, se usa la posición del camión
    const METROS_SIN_RECORRIDO = 1500;

    /**
     * @param array|null $posicion        ['lat' => ..., 'lng' => ...] última posición del camión
     * @param int|null   $soloCercaMetros si se indica, solo casas a esa distancia del camión
     */
    public function ciudadanos(Jornada $jornada, ?array $posicion = null, ?int $soloCercaMetros = null): Collection
    {
        $recorrido = $jornada->ruta->recorrido ?? [];

        return User::where('role', 'ciudadano')
            ->whereNotNull('latitud_casa')
            ->whereNotNull('longitud_casa')
            ->get()
            ->filter(function (User $u) use ($recorrido, $posicion, $soloCercaMetros) {
                $lat = (float) $u->latitud_casa;
                $lng = (float) $u->longitud_casa;

                $distCamion = $posicion ? Geo::distancia($lat, $lng, $posicion['lat'], $posicion['lng']) : null;

                if ($soloCercaMetros !== null) {
                    return $distCamion !== null && $distCamion <= $soloCercaMetros;
                }
                if (count($recorrido) > 0) {
                    return Geo::distanciaARecorrido($lat, $lng, $recorrido) <= self::METROS_DEL_RECORRIDO;
                }

                return $distCamion !== null && $distCamion <= self::METROS_SIN_RECORRIDO;
            })
            ->values();
    }
}
