<?php

namespace App\Services;

use App\Models\Colonia;
use App\Models\Festivo;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class CalendarioCiudadanoService
{
    // Mapa para convertir los días de la BD al estándar ISO de Carbon (1 = Lunes, 7 = Domingo)
    private $diasMapa = [
        'Lunes' => 1, 'Martes' => 2, 'Miércoles' => 3,
        'Jueves' => 4, 'Viernes' => 5, 'Sábado' => 6, 'Domingo' => 7
    ];

    public function getHorariosHabituales(int $coloniaId): array
    {
        $colonia = Colonia::with('rutas.horarios')->find($coloniaId);

        if (!$colonia) {
            throw ValidationException::withMessages(['colonia' => 'Colonia no encontrada.']);
        }

        $horariosHabituales = [];

        foreach ($colonia->rutas as $ruta) {
            foreach ($ruta->horarios as $horario) {
                $horariosHabituales[] = [
                    'ruta' => $ruta->nombre,
                    'dia_semana' => $horario->dia_semana,
                    'hora_inicio' => $horario->hora_inicio,
                    'hora_fin' => $horario->hora_fin,
                ];
            }
        }

        return $horariosHabituales;
    }

    public function generarCalendarioMensual(int $coloniaId, int $year, int $month): array
    {
        $colonia = Colonia::with('rutas.horarios')->find($coloniaId);
        if (!$colonia) {
            throw ValidationException::withMessages(['colonia' => 'Colonia no encontrada.']);
        }

        // 1. Extraer en qué días de la semana (1-7) pasa el camión por esta colonia
        $diasRecoleccion = [];
        foreach ($colonia->rutas as $ruta) {
            foreach ($ruta->horarios as $horario) {
                $numDia = $this->diasMapa[$horario->dia_semana];
                $diasRecoleccion[$numDia][] = [
                    'ruta' => $ruta->nombre,
                    'hora_inicio' => $horario->hora_inicio,
                    'hora_fin' => $horario->hora_fin,
                ];
            }
        }

        // 2. Traer los días festivos de ese mes
        $festivos = Festivo::whereYear('fecha', $year)
            ->whereMonth('fecha', $month)
            ->get()
            ->keyBy('fecha'); // Indexado por fecha para búsqueda rápida

        // 3. Generar los días del mes
        $calendario = [];
        $diasEnMes = Carbon::create($year, $month, 1)->daysInMonth;

        for ($d = 1; $d <= $diasEnMes; $d++) {
            $fechaActual = Carbon::create($year, $month, $d);
            $isoDay = $fechaActual->dayOfWeekIso; // 1 = Lunes, 7 = Domingo
            $fechaString = $fechaActual->toDateString();
            
            $esFestivo = $festivos->has($fechaString);
            $datosFestivo = $esFestivo ? $festivos[$fechaString] : null;

            // Si es un día habitual de recolección, lo agregamos al calendario visual
            if (isset($diasRecoleccion[$isoDay])) {
                $calendario[] = [
                    'fecha' => $fechaString,
                    'pasa_camion' => $esFestivo && $datosFestivo->suspende_servicio ? false : true,
                    'nota_festivo' => $esFestivo ? $datosFestivo->descripcion : null,
                    'horarios' => $diasRecoleccion[$isoDay]
                ];
            }
        }

        return $calendario;
    }
}