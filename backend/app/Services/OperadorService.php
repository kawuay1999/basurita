<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class OperadorService
{
    public function getAllOperadores(): Collection
    {
        return User::where('role', 'operador')
            ->orderBy('name', 'asc')
            ->get();
    }

    public function createOperador(array $data): User
    {
        // Validación extra de seguridad (aunque se valida en el request, el service protege)
        if (User::where('email', $data['email'])->exists()) {
            throw ValidationException::withMessages([
                'email' => ['El correo ya está registrado en el sistema.']
            ]);
        }

        return User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            // Usamos Hash::make o confiamos en el cast del modelo. 
            // Como en el Módulo 1 pusimos 'hashed' en los casts de User, lo pasamos directo.
            'password' => $data['password'], 
            'role' => 'operador', // Forzamos el rol, nunca se lee del input
        ]);
    }

    public function updateOperador(User $operador, array $data): User
    {
        // Asegurarse de que no le cambien el rol a administrador por error en este endpoint
        $updateData = [
            'name' => $data['name'] ?? $operador->name,
            'phone' => $data['phone'] ?? $operador->phone,
        ];

        // Solo actualiza email si viene en el request y es diferente
        if (isset($data['email']) && $data['email'] !== $operador->email) {
            $updateData['email'] = $data['email'];
        }

        // Solo actualiza contraseña si se proporciona una nueva
        if (!empty($data['password'])) {
            $updateData['password'] = $data['password'];
        }

        $operador->update($updateData);

        return $operador;
    }

    public function deleteOperador(User $operador): void
    {
        // Regla de integridad: Si el operador tiene jornadas asignadas en el futuro, no se debería borrar.
        // Por ahora, simplemente lo eliminamos. (En el módulo 6 agregaremos la validación de jornadas).
        $operador->delete();
    }
}