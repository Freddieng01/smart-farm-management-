<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Facades\File;

class ExportCredentialsCommand extends Command
{
    protected $signature = 'app:export-credentials';
    protected $description = 'Export user credentials for the presentation';

    public function handle()
    {
        $users = User::all();
        $out = "CREDENTIALS FOR PRESENTATION\n==========================\n\n";
        
        foreach ($users as $u) {
            $out .= "Role: {$u->role}\nEmail: {$u->email}\nPassword: password\n--------------------------\n";
        }

        File::put(base_path('presentation_credentials.txt'), $out);
        $this->info('Credentials exported to presentation_credentials.txt');
    }
}
