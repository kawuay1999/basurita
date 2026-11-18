<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->string('password'); // Almacenado con bcrypt
            $table->enum('role', ['visitante', 'ciudadano', 'operador', 'administrador'])->default('ciudadano');
            $table->unsignedBigInteger('colonia_id')->nullable(); // Opcional para ciudadanos y operadores
            $table->integer('failed_login_attempts')->default(0);
            $table->timestamp('locked_until')->nullable();
            $table->string('recovery_code')->nullable();
            $table->timestamp('recovery_code_expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};