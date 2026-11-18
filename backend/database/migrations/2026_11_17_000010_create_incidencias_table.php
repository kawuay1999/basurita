<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incidencias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('jornada_id')->constrained('jornadas')->cascadeOnDelete();
            $table->enum('tipo', ['calle_cerrada', 'falla_mecanica', 'camion_lleno', 'accidente', 'mal_clima', 'otro']);
            $table->text('descripcion')->nullable();
            $table->string('foto_path')->nullable(); // Ruta donde guardaremos la imagen
            $table->enum('estado', ['nueva', 'en_atencion', 'resuelta'])->default('nueva');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incidencias');
    }
};