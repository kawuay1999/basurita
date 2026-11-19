<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Jornada;
use App\Models\Ubicacion;
use App\Support\Geo;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Datos propios del ciudadano: perfil, ubicación de su casa
 * y el camión en ruta más cercano a su casa.
 */
class CiudadanoController extends Controller
{
    // Distancia máxima para considerar que un camión "pasa por su zona"
    const RADIO_BUSQUEDA_METROS = 5000;

    public function perfil(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->datosPerfil($request->user())]);
    }

    public function actualizarPerfil(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|min:3|max:255',
            'phone' => 'nullable|string|max:20',
            'radio_notificacion_metros' => 'nullable|integer|min:100|max:2000',
        ]);

        $user = $request->user();
        $user->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Tus datos se actualizaron correctamente.',
            'data' => $this->datosPerfil($user->fresh()),
        ]);
    }

    public function guardarCasa(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'direccion' => 'nullable|string|max:255',
        ]);

        $user = $request->user();
        $user->update([
            'latitud_casa' => $validated['lat'],
            'longitud_casa' => $validated['lng'],
            'direccion_casa' => $validated['direccion'] ?? null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Ubicación de tu casa guardada.',
            'data' => $this->datosPerfil($user->fresh()),
        ]);
    }

    /**
     * Busca entre los camiones en ruta el más cercano a la casa del ciudadano.
     */
    public function camionCercano(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->latitud_casa === null || $user->longitud_casa === null) {
            return response()->json([
                'estado_ruta' => 'sin_casa',
                'mensaje' => 'Elige la ubicación de tu casa para ver el camión.',
            ]);
        }

        $latCasa = (float) $user->latitud_casa;
        $lngCasa = (float) $user->longitud_casa;
        $mejor = null;

        $jornadas = Jornada::with(['camion', 'ruta'])->where('estado', 'en_curso')->get();

        foreach ($jornadas as $jornada) {
            $pos = $this->ultimaPosicion($jornada->id);
            if (!$pos) {
                continue;
            }

            $distancia = $this->distanciaMetros($latCasa, $lngCasa, $pos['lat'], $pos['lng']);
            if ($distancia <= self::RADIO_BUSQUEDA_METROS && (!$mejor || $distancia < $mejor['distancia'])) {
                $mejor = ['jornada' => $jornada, 'pos' => $pos, 'distancia' => $distancia];
            }
        }

        if (!$mejor) {
            return response()->json([
                'estado_ruta' => 'inactiva',
                'mensaje' => 'No hay camiones en ruta cerca de tu casa en este momento.',
            ]);
        }

        $minutos = (int) Carbon::parse($mejor['pos']['actualizado_en'])->diffInMinutes(Carbon::now());
        $senalPerdida = $minutos >= 2;

        return response()->json([
            'estado_ruta' => 'activa',
            'lat' => $mejor['pos']['lat'],
            'lng' => $mejor['pos']['lng'],
            'distancia_metros' => (int) round($mejor['distancia']),
            'camion' => $mejor['jornada']->camion->numero_economico ?? null,
            'ruta' => $mejor['jornada']->ruta->nombre ?? null,
            'senal_perdida' => $senalPerdida,
            'minutos_desde_actualizacion' => $minutos,
            'mensaje_tiempo' => $senalPerdida ? "Última actualización: hace {$minutos} min" : 'En vivo',
        ]);
    }

    // Se considera que el camión "pasó por tu casa" si estuvo a esta distancia o menos
    const METROS_PASO_POR_CASA = 300;

    /**
     * Historial de los últimos 7 días calculado con la ubicación de la casa:
     * qué recorridos pasan por su calle y a qué hora pasó realmente el camión.
     */
    public function historial(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->latitud_casa === null || $user->longitud_casa === null) {
            return response()->json([
                'exito' => false,
                'mensaje' => 'Elige la ubicación de tu casa para ver tu historial.',
                'data' => null,
            ]);
        }

        $lat = (float) $user->latitud_casa;
        $lng = (float) $user->longitud_casa;
        $hoy = Carbon::today();

        $jornadas = Jornada::with(['ruta', 'camion'])
            ->whereDate('fecha', '>=', $hoy->copy()->subDays(6)->toDateString())
            ->whereDate('fecha', '<=', $hoy->toDateString())
            ->orderBy('fecha', 'desc')
            ->get();

        $registros = collect();
        foreach ($jornadas as $j) {
            // ¿El camión estuvo cerca de la casa? (puntos GPS reales de esa jornada)
            $paso = null;
            foreach (Ubicacion::where('jornada_id', $j->id)->orderBy('created_at')->cursor() as $u) {
                if (Geo::distancia($lat, $lng, (float) $u->latitud, (float) $u->longitud) <= self::METROS_PASO_POR_CASA) {
                    $paso = $u;
                    break;
                }
            }

            // ¿La ruta está planeada para pasar por su calle?
            $recorrido = $j->ruta->recorrido ?? [];
            $enRecorrido = count($recorrido) > 0
                && Geo::distanciaARecorrido($lat, $lng, $recorrido) <= self::METROS_PASO_POR_CASA;

            if (!$paso && !$enRecorrido) {
                continue;
            }

            $fecha = Carbon::parse($j->fecha);
            $hora = $paso ? Carbon::parse($paso->fecha_hora_dispositivo ?? $paso->created_at) : null;

            if ($paso) {
                $estado = 'atendida';
                $descripcion = 'El camión pasó por tu calle.';
            } elseif ($j->estado === 'en_curso') {
                $estado = 'en_curso';
                $descripcion = 'El camión está haciendo el recorrido; aún no pasa por tu calle.';
            } elseif ($j->estado === 'finalizada') {
                $estado = 'no_paso';
                $descripcion = 'El recorrido terminó sin pasar cerca de tu casa.';
            } else {
                $estado = 'pendiente';
                $descripcion = 'Recorrido programado, aún no inicia.';
            }

            $registros->push([
                'id' => $j->id,
                'fecha_iso' => $fecha->toDateString(),
                'fecha' => $fecha->format('d/m/Y'),
                'dia_semana' => ucfirst($fecha->locale('es')->dayName),
                'ruta' => $j->ruta->nombre ?? 'Ruta asignada',
                'unidad' => $j->camion->numero_economico ?? 'Unidad',
                'estado' => $estado,
                'atendida' => (bool) $paso,
                'descripcion' => $descripcion,
                'hora_actualizacion' => $hora?->format('H:i'),
            ]);
        }

        $dia = function (Carbon $d, string $etiqueta) use ($registros) {
            $r = $registros->firstWhere('fecha_iso', $d->toDateString());
            if (!$r) {
                return [
                    'etiqueta' => $etiqueta, 'atendida' => false, 'estado' => 'sin_servicio',
                    'descripcion' => 'Sin recorrido por tu calle en esta fecha.', 'hora' => null, 'unidad' => null,
                ];
            }

            return [
                'etiqueta' => $etiqueta, 'atendida' => $r['atendida'], 'estado' => $r['estado'],
                'descripcion' => $r['descripcion'], 'hora' => $r['hora_actualizacion'], 'unidad' => $r['unidad'],
            ];
        };

        return response()->json([
            'exito' => true,
            'mensaje' => 'Historial de recolección consultado correctamente.',
            'data' => [
                'hoy' => $dia($hoy, 'Hoy'),
                'ayer' => $dia($hoy->copy()->subDay(), 'Ayer'),
                'semana' => $registros->values(),
            ],
        ]);
    }

    private function ultimaPosicion(int $jornadaId): ?array
    {
        $cache = Cache::get("ultima_ubicacion_jornada_{$jornadaId}");
        if ($cache) {
            return $cache;
        }

        $registro = Ubicacion::where('jornada_id', $jornadaId)->latest('created_at')->first();
        if (!$registro) {
            return null;
        }

        return [
            'lat' => (float) $registro->latitud,
            'lng' => (float) $registro->longitud,
            'actualizado_en' => $registro->created_at->toIso8601String(),
        ];
    }

    private function distanciaMetros(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $r = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $r * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function datosPerfil($user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone ?? $user->telefono,
            'role' => $user->role,
            'latitud_casa' => $user->latitud_casa !== null ? (float) $user->latitud_casa : null,
            'longitud_casa' => $user->longitud_casa !== null ? (float) $user->longitud_casa : null,
            'direccion_casa' => $user->direccion_casa,
            'radio_notificacion_metros' => $user->radio_notificacion_metros,
        ];
    }
}
