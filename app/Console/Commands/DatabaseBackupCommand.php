<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Exception;

class DatabaseBackupCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:backup';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a backup of the database';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting database backup...');

        try {
            $filename = 'backup-' . now()->format('Y-m-d_H-i-s') . '.sql';
            $path = storage_path('app/backups/' . $filename);

            if (!file_exists(storage_path('app/backups'))) {
                mkdir(storage_path('app/backups'), 0755, true);
            }

            $dbConfig = config('database.connections.' . config('database.default'));

            // Construct the mysqldump command
            $command = sprintf(
                'mysqldump -u %s -p%s %s > %s',
                escapeshellarg($dbConfig['username']),
                escapeshellarg($dbConfig['password']),
                escapeshellarg($dbConfig['database']),
                escapeshellarg($path)
            );

            exec($command, $output, $result);

            if ($result === 0) {
                $this->info("Backup successfully created: {$path}");
            } else {
                $this->error("Database backup failed. Ensure mysqldump is installed and configured correctly.");
            }

        } catch (Exception $e) {
            $this->error('An error occurred during backup: ' . $e->getMessage());
        }
    }
}
