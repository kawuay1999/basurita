<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        // Historial visible para el usuario
        Schema::create('notificaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('titulo');
            $table->text('mensaje');
            $table->boolean('leida')->default(false);
            $table->timestamps();
        });

        // Control interno para NO duplicar alertas del mismo camión en la misma jornada
        Schema::create('notificaciones_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('jornada_id')->constrained('jornadas')->cascadeOnDelete();
            $table->timestamps();
            
            // Un usuario solo puede recibir una alerta por jornada (recorrido)
            $table->unique(['user_id', 'jornada_id']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('notificaciones_logs');
        Schema::dropIfExists('notificaciones');
    }
};