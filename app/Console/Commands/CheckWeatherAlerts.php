<?php

namespace App\Console\Commands;

use App\Models\Farm;
use App\Models\Notification;
use App\Models\User;
use App\Services\WeatherService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckWeatherAlerts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'weather:check';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check weather for all farms and create notifications for alerts';

    public function __construct(private WeatherService $weatherService)
    {
        parent::__construct();
    }

    public function handle()
    {
        $this->info('Checking weather alerts for all farms...');
        $farms = Farm::all();
        $notificationsCreated = 0;

        foreach ($farms as $farm) {
            try {
                $latitude = $farm->latitude ?? $this->getCoordinates($farm->location_gps)[0];
                $longitude = $farm->longitude ?? $this->getCoordinates($farm->location_gps)[1];

                $alerts = $this->weatherService->getAlerts($latitude, $longitude);

                foreach ($alerts as $alert) {
                    // Avoid creating duplicate notifications for the same alert type and date
                    $exists = Notification::where('farm_id', $farm->id)
                        ->where('type', $alert['type'])
                        ->where('message', $alert['message'])
                        ->whereNull('read_at')
                        ->exists();

                    if (!$exists) {
                        // We notify the Farm Owner/Manager. For demo, we'll notify the first user associated with the farm
                        // In a real system, you'd use a relationship like $farm->users
                        $userId = User::first()?->id;

                        if ($userId) {
                            Notification::create([
                                'user_id' => $userId,
                                'farm_id' => $farm->id,
                                'type' => 'weather_alert',
                                'title' => 'Weather Alert: ' . $farm->name,
                                'message' => $alert['message'],
                                'priority' => $this->mapSeverity($alert['severity']),
                            ]);
                            $notificationsCreated++;
                        }
                    }
                }
            } catch (\Exception $e) {
                $this->error("Error checking weather for farm {$farm->id}: {$e->getMessage()}");
                Log::error("Weather Check Error: " . $e->getMessage());
            }
        }

        $this->info("Weather check completed. Created {$notificationsCreated} new notifications.");
    }

    private function mapSeverity(string $severity): string
    {
        return match (strtolower($severity)) {
            'high' => 'Urgent',
            'medium' => 'Normal',
            'low' => 'Low',
            default => 'Normal',
        };
    }

    private function getCoordinates(?string $locationGps): array
    {
        if (!$locationGps) {
            throw new \RuntimeException('Farm does not have GPS coordinates.');
        }

        $coordinates = array_map('trim', explode(',', $locationGps));

        if (count($coordinates) !== 2) {
            throw new \RuntimeException('Farm GPS location must be in latitude,longitude format.');
        }

        return [(float) $coordinates[0], (float) $coordinates[1]];
    }
}
