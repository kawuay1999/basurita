<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('camiones', function (Blueprint $table) {
            $table->id();
            $table->string('numero_economico')->unique()->comment('Identificador interno del camión');
            $table->string('placa')->unique();
            $table->decimal('capacidad_toneladas', 5, 2)->nullable();
            $table->enum('estado', ['activo', 'mantenimiento', 'inactivo'])->default('activo');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('camiones');
    }
};