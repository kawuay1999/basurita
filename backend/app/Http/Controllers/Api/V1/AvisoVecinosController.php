<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Jornada;
use App\Models\Notificacion;
use App\Models\Ubicacion;
use App\Services\FcmService;
use App\Services\VecinosRutaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

/**
 * El conductor manda avisos rápidos a los vecinos de su ruta
 * ("ya voy pasando", "voy con retraso", etc.).
 */
class AvisoVecinosController extends Controller
{
    // Mensajes listos para que el conductor solo toque un botón mientras maneja
    const AVISOS = [
        'pasando' => [
            'titulo' => 'El camión ya va pasando',
            'mensaje' => 'El camión recolector está pasando por tu calle. ¡Saca tu basura!',
            'solo_cerca' => 600,
        ],
        'en_camino' => [
            'titulo' => 'El camión inició su recorrido',
            'mensaje' => 'El camión recolector ya está en ruta por tu zona. Ten lista tu basura.',
            'solo_cerca' => null,
        ],
        'retraso' => [
            'titulo' => 'El camión viene con retraso',
            'mensaje' => 'El camión recolector viene con algo de retraso. Pasará más tarde por tu calle.',
            'solo_cerca' => null,
        ],
        'no_pasara' => [
            'titulo' => 'Hoy no pasará el camión',
            'mensaje' => 'Por un imprevisto, el camión no podrá terminar el recorrido hoy. Te avisaremos cuándo pasará.',
            'solo_cerca' => null,
        ],
    ];

    // Para no saturar a los vecinos: el mismo aviso solo una vez cada 3 minutos
    const ESPERA_SEGUNDOS = 180;

    public function enviar(Request $request, VecinosRutaService $vecinos, FcmService $fcm): JsonResponse
    {
        $validated = $request->validate([
            'tipo' => ['required', Rule::in(array_keys(self::AVISOS))],
        ]);

        $jornada = Jornada::with(['ruta', 'camion'])
            ->where('operador_id', $request->user()->id)
            ->where('estado', 'en_curso')
            ->latest('fecha')
            ->first();

        if (!$jornada) {
            return response()->json(['message' => 'Inicia tu ruta para poder avisar a los vecinos.'], 422);
        }

        $aviso = self::AVISOS[$validated['tipo']];
        $candado = "aviso_vecinos_{$jornada->id}_{$validated['tipo']}";
        if (!Cache::add($candado, true, self::ESPERA_SEGUNDOS)) {
            return response()->json(['message' => 'Ya enviaste este aviso hace poco. Espera unos minutos.'], 429);
        }

        $posicion = $this->ultimaPosicion($jornada->id);
        if ($aviso['solo_cerca'] && !$posicion) {
            Cache::forget($candado);
            return response()->json(['message' => 'Aún no tenemos tu ubicación. Espera la señal GPS.'], 422);
        }

        $destinatarios = $vecinos->ciudadanos($jornada, $posicion, $aviso['solo_cerca']);
        $unidad = $jornada->camion->numero_economico ?? null;
        $mensaje = $aviso['mensaje'] . ($unidad ? " (Unidad {$unidad})" : '');

        foreach ($destinatarios as $ciudadano) {
            Notificacion::create([
                'user_id' => $ciudadano->id,
                'titulo' => $aviso['titulo'],
                'mensaje' => $mensaje,
                'leida' => false,
            ]);
            // Push al celular (solo si tiene la APK y Firebase está configurado)
            $fcm->enviarA($ciudadano, $aviso['titulo'], $mensaje, ['tipo' => $validated['tipo']]);
        }

        $total = $destinatarios->count();

        return response()->json([
            'status' => 'success',
            'enviados' => $total,
            'message' => $total === 0
                ? 'Aviso registrado, pero todavía no hay vecinos registrados en esta zona.'
                : "Aviso enviado a {$total} " . ($total === 1 ? 'vecino' : 'vecinos') . '.',
        ]);
    }

    private function ultimaPosicion(int $jornadaId): ?array
    {
        $cache = Cache::get("ultima_ubicacion_jornada_{$jornadaId}");
        if ($cache) {
            return ['lat' => (float) $cache['lat'], 'lng' => (float) $cache['lng']];
        }
        $u = Ubicacion::where('jornada_id', $jornadaId)->latest('created_at')->first();

        return $u ? ['lat' => (float) $u->latitud, 'lng' => (float) $u->longitud] : null;
    }
}
