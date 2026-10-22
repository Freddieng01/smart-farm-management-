<?php

namespace App\Http\Controllers;

use App\Mail\UserInvitationMail;
use App\Models\User;
use App\Models\UserInvitation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class InvitationController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        if (config('mail.default') === 'log') {
            return response()->json([
                'message' => 'Email delivery is not configured. Set MAIL_MAILER=smtp and valid SMTP credentials before sending invitations.',
            ], 503);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'role' => ['required', Rule::in(['Admin', 'Manager', 'Agronomist', 'Worker', 'Accountant', 'Farm-owner'])],
        ]);

        if (UserInvitation::where('email', $validated['email'])->whereNull('accepted_at')->where('expires_at', '>', now())->exists()) {
            throw ValidationException::withMessages([
                'email' => ['An active invitation has already been sent to this email address.'],
            ]);
        }

        UserInvitation::where('email', $validated['email'])->whereNull('accepted_at')->delete();

        $plainToken = Str::random(64);
        $invitation = UserInvitation::create([
            ...$validated,
            'invited_by' => $request->user()->id,
            'token' => hash('sha256', $plainToken),
            'expires_at' => now()->addDays(7),
        ]);

        $frontendUrl = rtrim(config('services.invitation.frontend_url'), '/');
        $acceptanceUrl = $frontendUrl.'/accept-invite?token='.urlencode($plainToken);

        try {
            Mail::to($invitation->email)->send(new UserInvitationMail($invitation, $acceptanceUrl));
        } catch (\Throwable $exception) {
            $invitation->delete();

            report($exception);

            return response()->json([
                'message' => 'The invitation email could not be sent. Check the mail configuration and try again.',
            ], 502);
        }

        return response()->json([
            'message' => 'Invitation email sent successfully.',
        ], 201);
    }

    public function show(string $token): JsonResponse
    {
        $invitation = $this->findValidInvitation($token);

        return response()->json([
            'data' => [
                'name' => $invitation->name,
                'email' => $invitation->email,
                'role' => $invitation->role,
            ],
        ]);
    }

    public function accept(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $invitation = $this->findValidInvitation($validated['token']);

        $user = DB::transaction(function () use ($invitation, $validated) {
            $user = User::create([
                'name' => $invitation->name,
                'email' => $invitation->email,
                'role' => $invitation->role,
                'password' => Hash::make($validated['password']),
                'email_verified_at' => now(),
            ]);

            $invitation->update(['accepted_at' => now()]);

            return $user;
        });

        return response()->json([
            'message' => 'Your account is ready. You can now sign in.',
            'user' => $user,
        ], 201);
    }

    private function findValidInvitation(string $token): UserInvitation
    {
        $invitation = UserInvitation::where('token', hash('sha256', $token))->first();

        if (! $invitation || $invitation->accepted_at || $invitation->expires_at->isPast()) {
            abort(404, 'This invitation is invalid, expired, or has already been used.');
        }

        return $invitation;
    }
}
