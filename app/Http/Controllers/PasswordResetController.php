<?php

namespace App\Http\Controllers;

use App\Mail\PasswordResetMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate(['email' => ['required', 'email']]);
        $user = User::where('email', $validated['email'])->first();

        if ($user) {
            $token = Str::random(64);
            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $user->email],
                ['token' => Hash::make($token), 'created_at' => now()],
            );

            $frontendUrl = rtrim(config('services.invitation.frontend_url'), '/');
            $resetUrl = $frontendUrl.'/reset-password?token='.urlencode($token).'&email='.urlencode($user->email);

            try {
                Mail::to($user->email)->send(new PasswordResetMail($resetUrl));
            } catch (\Throwable $exception) {
                report($exception);

                return response()->json([
                    'message' => 'The password reset email could not be sent. Check the mail configuration and try again.',
                ], 502);
            }
        }

        return response()->json([
            'message' => 'If an account exists for that email, a password reset link has been sent.',
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $record = DB::table('password_reset_tokens')->where('email', $validated['email'])->first();
        if (! $record || ! $record->created_at || now()->diffInMinutes($record->created_at) > 60 || ! Hash::check($validated['token'], $record->token)) {
            throw ValidationException::withMessages([
                'token' => ['This password reset link is invalid or expired.'],
            ]);
        }

        $user = User::where('email', $validated['email'])->firstOrFail();
        $user->update(['password' => $validated['password']]);
        DB::table('password_reset_tokens')->where('email', $user->email)->delete();
        $user->tokens()->delete();

        return response()->json(['message' => 'Password reset successfully.']);
    }
}
