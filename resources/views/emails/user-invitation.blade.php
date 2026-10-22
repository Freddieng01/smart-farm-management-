<!doctype html>
<html lang="en">
<body>
    <p>Hello {{ $invitation->name }},</p>
    <p>You have been invited to join Smart Farm Management as a {{ $invitation->role }}.</p>
    <p><a href="{{ $acceptanceUrl }}">Set up your account</a></p>
    <p>This invitation expires on {{ $invitation->expires_at->format('F j, Y \a\t g:i A') }}.</p>
    <p>If you were not expecting this invitation, you can ignore this email.</p>
</body>
</html>
