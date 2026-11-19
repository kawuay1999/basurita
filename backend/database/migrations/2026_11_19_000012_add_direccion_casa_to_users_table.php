<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Dirección legible de la casa (ej. "Calle Jaspe 12, Tecámac"), obtenida del mapa
            if (!Schema::hasColumn('users', 'direccion_casa')) {
                $table->string('direccion_casa')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'direccion_casa')) {
                $table->dropColumn('direccion_casa');
            }
        });
    }
};
