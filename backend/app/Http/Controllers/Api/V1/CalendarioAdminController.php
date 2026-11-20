<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CalendarioRecoleccion;
use App\Models\Ruta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * El admin publica qué días del mes pasa el camión
 * (pares, impares, ciertos días de la semana o días sueltos).
 */
class CalendarioAdminController extends Controller
{
    /** Calendarios publicados de un mes + rutas para elegir. */
    public function index(Request $request): JsonResponse
    {
        $v = $request->validate([
            'anio' => 'required|integer|min:2024|max:2100',
            'mes' => 'required|integer|between:1,12',
        ]);

        $calendarios = CalendarioRecoleccion::with('ruta:id,nombre')
            ->where('anio', $v['anio'])
            ->where('mes', $v['mes'])
            ->orderByRaw('ruta_id IS NOT NULL')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $calendarios,
            'rutas' => Ruta::where('activa', true)->orderBy('nombre')->get(['id', 'nombre']),
        ]);
    }

    /** Crea o reemplaza el calendario de un mes (para todas las rutas o una). */
    public function guardar(Request $request): JsonResponse
    {
        $v = $request->validate([
            'anio' => 'required|integer|min:2024|max:2100',
            'mes' => 'required|integer|between:1,12',
            'ruta_id' => 'nullable|integer|exists:rutas,id',
            'modo' => ['required', Rule::in(CalendarioRecoleccion::MODOS)],
            'dias_semana' => 'required_if:modo,dias_semana|array',
            'dias_semana.*' => 'integer|between:1,7',
            'dias' => 'required_if:modo,personalizado|array',
            'dias.*' => 'integer|between:1,31',
            'nota' => 'nullable|string|max:255',
        ], [
            'dias_semana.required_if' => 'Elige al menos un día de la semana.',
            'dias.required_if' => 'Marca al menos un día en el calendario.',
        ]);

        $dias = CalendarioRecoleccion::calcularDias(
            $v['anio'], $v['mes'], $v['modo'],
            array_map('intval', $v['dias_semana'] ?? []),
            array_map('intval', $v['dias'] ?? [])
        );

        if (count($dias) === 0) {
            return response()->json(['mensaje' => 'El calendario no tiene ningún día. Revisa lo que elegiste.'], 422);
        }

        $calendario = CalendarioRecoleccion::updateOrCreate(
            ['anio' => $v['anio'], 'mes' => $v['mes'], 'ruta_id' => $v['ruta_id'] ?? null],
            [
                'modo' => $v['modo'],
                'dias_semana' => $v['modo'] === 'dias_semana' ? array_values(array_map('intval', $v['dias_semana'])) : null,
                'dias' => $dias,
                'nota' => $v['nota'] ?? null,
                'publicado' => true,
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Calendario publicado. Los ciudadanos ya lo ven en su app.',
            'data' => $calendario->load('ruta:id,nombre'),
        ]);
    }

    public function eliminar(CalendarioRecoleccion $calendario): JsonResponse
    {
        $calendario->delete();

        return response()->json(['status' => 'success', 'message' => 'Calendario eliminado.']);
    }
}
