<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Gestión de ciudadanos (usuarios de la app) desde el panel del admin.
 */
class UsuarioAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $buscar = trim((string) $request->query('buscar', ''));

        $usuarios = User::where('role', 'ciudadano')
            ->when($buscar !== '', function ($q) use ($buscar) {
                $like = '%' . mb_strtolower($buscar) . '%';
                $q->where(fn ($w) => $w->whereRaw('LOWER(name) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(email) LIKE ?', [$like])
                    ->orWhere('phone', 'like', "%{$buscar}%"));
            })
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (User $u) => $this->datos($u));

        return response()->json([
            'status' => 'success',
            'data' => $usuarios,
            'total' => User::where('role', 'ciudadano')->count(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $this->validar($request);
        $usuario = User::create([
            'name' => $v['name'],
            'email' => $v['email'],
            'phone' => $v['phone'],
            'password' => $v['password'], // el modelo la encripta
            'role' => 'ciudadano',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Ciudadano creado. Ya puede entrar a la app con su correo y contraseña.',
            'data' => $this->datos($usuario),
        ], 201);
    }

    public function update(Request $request, User $usuario): JsonResponse
    {
        if ($usuario->role !== 'ciudadano') {
            return response()->json(['mensaje' => 'Solo se pueden editar ciudadanos desde este módulo.'], 403);
        }

        $v = $this->validar($request, $usuario);
        $datos = ['name' => $v['name'], 'email' => $v['email'], 'phone' => $v['phone']];
        if (!empty($v['password'])) {
            $datos['password'] = $v['password'];
        }
        $usuario->update($datos);

        // Si le cambiaron la contraseña, se cierran sus sesiones abiertas
        if (!empty($v['password'])) {
            $usuario->tokens()->delete();
        }

        return response()->json([
            'status' => 'success',
            'message' => !empty($v['password'])
                ? 'Datos y contraseña actualizados. Deberá entrar de nuevo con la contraseña nueva.'
                : 'Datos actualizados.',
            'data' => $this->datos($usuario->fresh()),
        ]);
    }

    public function destroy(User $usuario): JsonResponse
    {
        if ($usuario->role !== 'ciudadano') {
            return response()->json(['mensaje' => 'Solo se pueden eliminar ciudadanos desde este módulo.'], 403);
        }
        $usuario->tokens()->delete();
        $usuario->delete();

        return response()->json(['status' => 'success', 'message' => 'Ciudadano eliminado.']);
    }

    /** Mismas reglas que el registro de la app. */
    private function validar(Request $request, ?User $usuario = null): array
    {
        $request->merge([
            'name' => trim(preg_replace('/\s+/', ' ', (string) $request->input('name'))),
            'email' => strtolower(trim((string) $request->input('email'))),
            'phone' => preg_replace('/\D/', '', (string) $request->input('phone')),
        ]);

        $password = ['string', Password::min(8)->mixedCase()->numbers()];

        return $request->validate([
            'name' => ['required', 'string', 'min:3', 'max:80', "regex:/^[\\pL' .-]+$/u"],
            'email' => ['required', 'string', 'max:120', 'email:rfc', 'regex:/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/',
                Rule::unique('users', 'email')->ignore($usuario?->id)],
            'phone' => ['required', 'digits:10'],
            'password' => $usuario ? array_merge(['nullable'], $password) : array_merge(['required'], $password),
        ]);
    }

    private function datos(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'phone' => $u->phone ?? $u->telefono,
            'direccion_casa' => $u->direccion_casa,
            'tiene_casa' => $u->latitud_casa !== null,
            'tiene_app' => !empty($u->fcm_token),
            'created_at' => $u->created_at,
        ];
    }
}
