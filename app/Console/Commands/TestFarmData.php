<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Farm;

class TestFarmData extends Command
{
    protected $signature = 'app:test-farm-data';
    protected $description = 'Test farm coordinates';

    public function handle()
    {
        $farm = Farm::first();
        if (!$farm) {
            $this->error('No farm found');
            return;
        }

        $this->info('Farm: ' . $farm->name);
        $this->info('ID: ' . $farm->id);
        $this->info('Latitude: ' . ($farm->latitude ?? 'NULL'));
        $this->info('Longitude: ' . ($farm->longitude ?? 'NULL'));
        $this->info('Location GPS: ' . ($farm->location_gps ?? 'NULL'));
    }
}
