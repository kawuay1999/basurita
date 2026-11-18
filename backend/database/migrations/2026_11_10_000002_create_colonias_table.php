<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('colonias', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->string('zona_o_sector')->nullable(); // Útil para agrupar logísticamente
            $table->string('codigo_postal')->nullable();
            $table->boolean('activa')->default(true); // Para deshabilitar sin borrar historial
            $table->timestamps();
        });
        
        // Relacionar la tabla users con colonias (actualizando la FK de la migración anterior)
        Schema::table('users', function (Blueprint $table) {
            $table->foreign('colonia_id')->references('id')->on('colonias')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['colonia_id']);
        });
        Schema::dropIfExists('colonias');
    }
};