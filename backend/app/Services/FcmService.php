<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Envía notificaciones push a la APK con Firebase Cloud Messaging (API v1).
 *
 * Necesita la clave de cuenta de servicio de Firebase (archivo JSON) en la ruta
 * de config('services.fcm.credentials'). Si no existe, no envía nada y la app
 * sigue funcionando: el ciudadano ve los avisos al abrirla.
 */
class FcmService
{
    public function configurado(): bool
    {
        return is_file((string) config('services.fcm.credentials'));
    }

    /** Envía un aviso al celular del usuario. Devuelve true si Firebase lo aceptó. */
    public function enviarA(User $user, string $titulo, string $mensaje, array $datos = []): bool
    {
        if (empty($user->fcm_token) || !$this->configurado()) {
            return false;
        }

        try {
            $cred = $this->credenciales();
            $respuesta = Http::withToken($this->tokenDeAcceso($cred))
                ->timeout(8)
                ->post("https://fcm.googleapis.com/v1/projects/{$cred['project_id']}/messages:send", [
                    'message' => [
                        'token' => $user->fcm_token,
                        'notification' => ['title' => $titulo, 'body' => $mensaje],
                        'data' => array_map('strval', $datos + ['tipo' => 'aviso_camion']),
                        'android' => [
                            'priority' => 'high',
                            'notification' => ['sound' => 'default'],
                        ],
                    ],
                ]);

            if ($respuesta->successful()) {
                return true;
            }

            // El celular desinstaló la app o el token caducó: lo borramos
            if (in_array($respuesta->status(), [400, 404], true)
                && str_contains($respuesta->body(), 'UNREGISTERED')) {
                $user->forceFill(['fcm_token' => null])->save();
            }
            Log::warning('FCM rechazó el aviso', ['status' => $respuesta->status(), 'user' => $user->id]);
        } catch (\Throwable $e) {
            Log::warning('No se pudo enviar el push: ' . $e->getMessage());
        }

        return false;
    }

    private function credenciales(): array
    {
        $json = json_decode((string) file_get_contents(config('services.fcm.credentials')), true);
        if (!is_array($json) || empty($json['private_key']) || empty($json['client_email']) || empty($json['project_id'])) {
            throw new \RuntimeException('El archivo de cuenta de servicio de Firebase no es válido.');
        }

        return $json;
    }

    /** Token OAuth de Google (dura 1 hora; lo guardamos 50 minutos). */
    private function tokenDeAcceso(array $cred): string
    {
        return Cache::remember('fcm_access_token', now()->addMinutes(50), function () use ($cred) {
            $ahora = time();
            $b64 = fn (string $s) => rtrim(strtr(base64_encode($s), '+/', '-_'), '=');

            $cabecera = $b64(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
            $datos = $b64(json_encode([
                'iss' => $cred['client_email'],
                'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                'aud' => $cred['token_uri'] ?? 'https://oauth2.googleapis.com/token',
                'iat' => $ahora,
                'exp' => $ahora + 3600,
            ]));

            $firma = '';
            if (!openssl_sign("{$cabecera}.{$datos}", $firma, $cred['private_key'], OPENSSL_ALGO_SHA256)) {
                throw new \RuntimeException('No se pudo firmar la solicitud para Firebase.');
            }

            $respuesta = Http::asForm()->timeout(8)->post($cred['token_uri'] ?? 'https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => "{$cabecera}.{$datos}." . $b64($firma),
            ])->throw();

            return $respuesta->json('access_token');
        });
    }
}
