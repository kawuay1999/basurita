<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

class AuthService
{
    const MAX_FAILED_ATTEMPTS = 5;
    const LOCKOUT_MINUTES = 15;

    public function registerCitizen(array $data): User
    {
        return User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => $data['password'], // El model cast aplica bcrypt
            'role' => 'ciudadano',
            'colonia_id' => $data['colonia_id'] ?? null,
        ]);
    }

    public function login(array $credentials): array
    {
        $user = User::where('email', $credentials['email'])->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'email' => ['Las credenciales son incorrectas.'],
            ]);
        }

        // Verificar bloqueo temporal por intentos fallidos
        if ($user->locked_until && Carbon::now()->lt($user->locked_until)) {
            $minutesLeft = Carbon::now()->diffInMinutes($user->locked_until) + 1;
            throw ValidationException::withMessages([
                'email' => ["Cuenta temporalmente bloqueada. Intente de nuevo en {$minutesLeft} minutos."],
            ]);
        }

        if (!Hash::check($credentials['password'], $user->password)) {
            $user->increment('failed_login_attempts');
            
            if ($user->failed_login_attempts >= self::MAX_FAILED_ATTEMPTS) {
                $user->update([
                    'locked_until' => Carbon::now()->addMinutes(self::LOCKOUT_MINUTES),
                    'failed_login_attempts' => 0
                ]);
                throw ValidationException::withMessages([
                    'email' => ['Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.'],
                ]);
            }

            throw ValidationException::withMessages([
                'email' => ['Las credenciales son incorrectas.'],
            ]);
        }

        // Resetear intentos fallidos al iniciar sesión con éxito
        $user->update([
            'failed_login_attempts' => 0,
            'locked_until' => null,
        ]);

        // Crear token con Sanctum
        $token = $user->createToken('basurita_token')->plainTextToken;

        return [
            'user' => $user,
            'token' => $token,
            'redirect_url' => $this->getRedirectUrlByRole($user->role)
        ];
    }

    public function logout($user): void
    {
        $user->currentAccessToken()->delete();
    }

    public function generateRecoveryCode(string $email): string
    {
        $user = User::where('email', $email)->first();
        
        if (!$user) {
            // Por seguridad, no revelamos si el correo existe o no
            return 'Si el correo está registrado, recibirá instrucciones.';
        }

        $code = rand(100000, 999999);
        $user->update([
            'recovery_code' => Hash::make($code),
            'recovery_code_expires_at' => Carbon::now()->addMinutes(30),
        ]);

        // Simulación de envío (en producción se integra con servicio de correo/SMS)
        // Log::info("Código de recuperación para {$email}: {$code}");

        return 'Código de recuperación enviado con éxito.';
    }

    private function getRedirectUrlByRole(string $role): string
    {
        return match ($role) {
            'administrador' => '/admin',
            'operador' => '/operador',
            'ciudadano' => '/ciudadano',
            default => '/'
        };
    }
}