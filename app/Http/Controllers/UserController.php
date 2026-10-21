<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::query()->paginate(15);
        return response()->json($users);
    }

    public function show($id): JsonResponse
    {
        $user = User::findOrFail($id);
        return response()->json($user);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes','required','email', Rule::unique('users','email')->ignore($user->id)],
            'role' => ['sometimes', 'required', Rule::in(['Admin', 'Manager', 'Agronomist', 'Worker', 'Accountant', 'Farm-owner'])],
        ]);

        $user->update($data);

        return response()->json($user);
    }

    public function destroy($id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($user->role === 'Admin') {
            return response()->json(['message' => 'The System Admin cannot be deleted.'], 403);
        }

        $user->delete();
        return response()->json(['message' => 'User deleted']);
    }
}
