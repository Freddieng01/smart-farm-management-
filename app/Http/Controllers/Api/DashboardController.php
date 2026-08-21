<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Farm;
use App\Models\Field;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function summary(): JsonResponse
    {
        return response()->json([
            'data' => [
                'farms' => Farm::count(),
                'fields' => Field::count(),
                'active_users' => User::whereHas('tokens')->count(),
            ],
        ]);
    }
}
