<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Recorrido de la ruta: lista de puntos [lat, lng] por las calles que el camión
 * debe recorrer. Lo dibuja el administrador y el conductor lo sigue en la app.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rutas', function (Blueprint $table) {
            $table->json('recorrido')->nullable()->after('descripcion');
        });
    }

    public function down(): void
    {
        Schema::table('rutas', function (Blueprint $table) {
            $table->dropColumn('recorrido');
        });
    }
};
