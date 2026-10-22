<?php

namespace Tests\Feature;

use App\Mail\UserInvitationMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserInvitationTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_an_admin_can_send_an_invitation(): void
    {
        Sanctum::actingAs($this->makeUser(['role' => 'Manager']));

        $this->postJson('/api/users/invitations', [
            'name' => 'New Worker',
            'email' => 'worker@example.com',
            'role' => 'Worker',
        ])->assertForbidden();
    }

    public function test_recipient_sets_their_own_password_from_a_one_time_invitation(): void
    {
        Mail::fake();
        $admin = $this->makeUser(['role' => 'Admin']);
        Sanctum::actingAs($admin);

        $this->postJson('/api/users/invitations', [
            'name' => 'New Worker',
            'email' => 'worker@example.com',
            'role' => 'Worker',
        ])->assertCreated();

        $acceptanceUrl = null;
        Mail::assertSent(UserInvitationMail::class, function (UserInvitationMail $mail) use (&$acceptanceUrl): bool {
            $acceptanceUrl = $mail->acceptanceUrl;

            return $mail->hasTo('worker@example.com');
        });

        parse_str((string) parse_url($acceptanceUrl, PHP_URL_QUERY), $query);
        $token = $query['token'];

        $this->getJson("/api/invitations/{$token}")
            ->assertOk()
            ->assertJsonPath('data.email', 'worker@example.com');

        $this->postJson('/api/invitations/accept', [
            'token' => $token,
            'password' => 'recipient-password',
            'password_confirmation' => 'recipient-password',
        ])->assertCreated();

        $user = User::where('email', 'worker@example.com')->firstOrFail();
        $this->assertTrue(Hash::check('recipient-password', $user->password));

        $this->postJson('/api/invitations/accept', [
            'token' => $token,
            'password' => 'another-password',
            'password_confirmation' => 'another-password',
        ])->assertNotFound();
    }
}
