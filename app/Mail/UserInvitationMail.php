<?php

namespace App\Mail;

use App\Models\UserInvitation;
use Illuminate\Bus\Queueable;
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

    public function build(): self
    {
        return $this->subject('You are invited to Smart Farm Management')
            ->view('emails.user-invitation');
    }
}
