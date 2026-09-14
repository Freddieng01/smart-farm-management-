<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $query = Notification::query();

        // Default to the logged-in user's own notifications
        $query->where('user_id', $request->user()->id);

        if ($request->has('farm_id')) {
            $query->where('farm_id', $request->input('farm_id'));
        }
        if ($request->has('unread_only')) {
            $query->whereNull('read_at');
        }

        return response()->json($query->orderByDesc('created_at')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'farm_id' => 'nullable|exists:farms,id',
            'type' => 'required|string|max:255',
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'priority' => 'nullable|in:Low,Normal,High,Urgent',
        ]);

        $notification = Notification::create($validated);

        return response()->json($notification, 201);
    }

    public function show(Notification $notification)
    {
        return response()->json($notification);
    }

    public function update(Request $request, Notification $notification)
    {
        $validated = $request->validate([
            'priority' => 'sometimes|in:Low,Normal,High,Urgent',
            'read_at' => 'nullable|date',
        ]);

        $notification->update($validated);

        return response()->json($notification);
    }

    public function destroy(Notification $notification)
    {
        $notification->delete();

        return response()->json(null, 204);
    }

    /**
     * Mark a notification as read.
     */
    public function markAsRead(Notification $notification)
    {
        $notification->update(['read_at' => now()]);

        return response()->json($notification);
    }
}