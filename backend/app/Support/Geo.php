<?php

namespace App\Support;

/**
 * Cálculos de distancia sobre el mapa (en metros).
 */
class Geo
{
    /** Distancia entre dos puntos (fórmula de Haversine). */
    public static function distancia(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $r = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $r * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /**
     * Distancia más corta de un punto a un recorrido (lista de [lat, lng]).
     * Mide contra cada tramo de calle, no solo contra los vértices.
     */
    public static function distanciaARecorrido(float $lat, float $lng, array $recorrido): ?float
    {
        if (count($recorrido) === 0) {
            return null;
        }
        if (count($recorrido) === 1) {
            return self::distancia($lat, $lng, (float) $recorrido[0][0], (float) $recorrido[0][1]);
        }

        // Proyección plana local (suficiente para distancias de una ciudad)
        $mLat = 111320.0;
        $mLng = 111320.0 * cos(deg2rad($lat));
        $min = INF;

        for ($i = 0; $i < count($recorrido) - 1; $i++) {
            $ax = ((float) $recorrido[$i][1] - $lng) * $mLng;
            $ay = ((float) $recorrido[$i][0] - $lat) * $mLat;
            $bx = ((float) $recorrido[$i + 1][1] - $lng) * $mLng;
            $by = ((float) $recorrido[$i + 1][0] - $lat) * $mLat;

            $dx = $bx - $ax;
            $dy = $by - $ay;
            $largo2 = $dx * $dx + $dy * $dy;
            $t = $largo2 > 0 ? max(0, min(1, -($ax * $dx + $ay * $dy) / $largo2)) : 0;

            $px = $ax + $t * $dx;
            $py = $ay + $t * $dy;
            $min = min($min, sqrt($px * $px + $py * $py));
        }

        return $min;
    }
}
