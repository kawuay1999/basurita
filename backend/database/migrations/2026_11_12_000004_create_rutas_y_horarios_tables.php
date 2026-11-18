<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabla principal de Rutas
        Schema::create('rutas', function (Blueprint $table) {
            $table->id();
            $table->string('nombre')->unique();
            $table->text('descripcion')->nullable();
            $table->boolean('activa')->default(true);
            $table->timestamps();
        });

        // 2. Tabla pivote (Muchos a Muchos: Colonias - Rutas)
        Schema::create('colonia_ruta', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ruta_id')->constrained('rutas')->cascadeOnDelete();
            $table->foreignId('colonia_id')->constrained('colonias')->cascadeOnDelete();
            $table->timestamps();
        });

        // 3. Tabla de Horarios (Uno a Muchos: Ruta -> Horarios)
        Schema::create('horarios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ruta_id')->constrained('rutas')->cascadeOnDelete();
            $table->enum('dia_semana', ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']);
            $table->time('hora_inicio');
            $table->time('hora_fin');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('horarios');
        Schema::dropIfExists('colonia_ruta');
        Schema::dropIfExists('rutas');
    }
};