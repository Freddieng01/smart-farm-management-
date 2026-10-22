<?php

namespace App\Mail;

use App\Models\UserInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class UserInvitationMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public UserInvitation $invitation,
        public string $acceptanceUrl,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(config('mail.from.address'), 'Farm Management System'),
            replyTo: [new Address('noreply@farmmanagement.com')],
            subject: 'You are invited to Smart Farm Management',
        );
    }

    public function build(): self
    {
        return $this->subject('You are invited to Smart Farm Management')
            ->view('emails.user-invitation')
            ->with([
                'invitation' => $this->invitation,
                'acceptanceUrl' => $this->acceptanceUrl,
            ]);
    }
}
