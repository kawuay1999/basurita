<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'colonia_id')) {
                $table->foreignId('colonia_id')->nullable()->constrained('colonias')->nullOnDelete();
            }
            if (!Schema::hasColumn('users', 'telefono')) {
                $table->string('telefono', 20)->nullable();
            }
            if (!Schema::hasColumn('users', 'role')) {
                $table->string('role', 20)->default('ciudadano');
            }
            if (!Schema::hasColumn('users', 'latitud_casa')) {
                $table->decimal('latitud_casa', 10, 7)->nullable();
            }
            if (!Schema::hasColumn('users', 'longitud_casa')) {
                $table->decimal('longitud_casa', 10, 7)->nullable();
            }
            if (!Schema::hasColumn('users', 'radio_notificacion_metros')) {
                $table->integer('radio_notificacion_metros')->default(350)->nullable();
            }
            if (!Schema::hasColumn('users', 'fcm_token')) {
                $table->string('fcm_token')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columnas = [
                'telefono',
                'role',
                'latitud_casa',
                'longitud_casa',
                'radio_notificacion_metros',
                'fcm_token'
            ];
            foreach ($columnas as $col) {
                if (Schema::hasColumn('users', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};