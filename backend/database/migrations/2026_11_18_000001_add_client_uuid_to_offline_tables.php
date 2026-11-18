<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Agregar client_uuid a ubicaciones si falta
        if (Schema::hasTable('ubicaciones') && !Schema::hasColumn('ubicaciones', 'client_uuid')) {
            Schema::table('ubicaciones', function (Blueprint $table) {
                $table->uuid('client_uuid')->nullable()->unique()->after('id');
            });
        }

        // 2. Crear tabla incidencias si aún no existe
        if (!Schema::hasTable('incidencias')) {
            Schema::create('incidencias', function (Blueprint $table) {
                $table->id();
                $table->uuid('client_uuid')->nullable()->unique();
                $table->foreignId('jornada_id')->constrained('jornadas')->cascadeOnDelete();
                $table->string('tipo', 50); // calle_cerrada, falla_mecanica, accidente
                $table->text('descripcion')->nullable();
                $table->string('foto_path')->nullable();
                $table->string('estado', 30)->default('nueva'); // nueva, en_atencion, resuelta
                $table->timestamps();
            });
        } elseif (!Schema::hasColumn('incidencias', 'client_uuid')) {
            Schema::table('incidencias', function (Blueprint $table) {
                $table->uuid('client_uuid')->nullable()->unique()->after('id');
            });
        }

        // 3. Crear tablas de notificaciones si aún no existen (usadas por GeocercaService)
        if (!Schema::hasTable('notificaciones')) {
            Schema::create('notificaciones', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('titulo');
                $table->text('mensaje');
                $table->boolean('leida')->default(false);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('notificaciones_logs')) {
            Schema::create('notificaciones_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('jornada_id')->constrained('jornadas')->cascadeOnDelete();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('ubicaciones') && Schema::hasColumn('ubicaciones', 'client_uuid')) {
            Schema::table('ubicaciones', function (Blueprint $table) {
                $table->dropColumn('client_uuid');
            });
        }
        Schema::dropIfExists('notificaciones_logs');
        Schema::dropIfExists('notificaciones');
        Schema::dropIfExists('incidencias');
    }
};