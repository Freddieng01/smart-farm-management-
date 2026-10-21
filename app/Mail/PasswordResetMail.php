<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public string $resetUrl,
    ) {
    }

    public function build(): self
    {
        return $this->subject('Reset your Smart Farm Management password')
            ->view('emails.password-reset');
    }
}
