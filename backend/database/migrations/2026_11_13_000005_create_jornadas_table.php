<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jornadas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('operador_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('camion_id')->constrained('camiones')->cascadeOnDelete();
            $table->foreignId('ruta_id')->constrained('rutas')->cascadeOnDelete();
            $table->date('fecha');
            $table->enum('estado', ['programada', 'en_curso', 'finalizada', 'cancelada'])->default('programada');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jornadas');
    }
};