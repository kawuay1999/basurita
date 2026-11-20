<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Calendario de recolección que publica el admin por mes.
 * Ejemplo: "en octubre pasamos los días pares" (para todas las rutas o una en especial).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calendarios_recoleccion', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('anio');
            $table->unsignedTinyInteger('mes');
            // null = aplica a todas las rutas
            $table->foreignId('ruta_id')->nullable()->constrained('rutas')->cascadeOnDelete();
            // pares | impares | dias_semana | personalizado
            $table->string('modo', 20);
            // Días de la semana (1 = lunes ... 7 = domingo) cuando modo = dias_semana
            $table->json('dias_semana')->nullable();
            // Días del mes resultantes (lo que ve el ciudadano)
            $table->json('dias');
            $table->string('nota', 255)->nullable();
            $table->boolean('publicado')->default(true);
            $table->timestamps();

            $table->unique(['anio', 'mes', 'ruta_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendarios_recoleccion');
    }
};
