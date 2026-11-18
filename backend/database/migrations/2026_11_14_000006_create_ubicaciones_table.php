<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ubicaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('jornada_id')->constrained('jornadas')->cascadeOnDelete();
            $table->decimal('latitud', 10, 8);
            $table->decimal('longitud', 11, 8);
            $table->decimal('precision_metros', 8, 2)->nullable();
            $table->timestamp('fecha_hora_dispositivo'); // Timestamp real de cuando el GPS capturó el dato
            $table->timestamps(); // Timestamp de cuando llegó al servidor
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ubicaciones');
    }
};