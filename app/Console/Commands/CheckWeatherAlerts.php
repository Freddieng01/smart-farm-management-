<?php

namespace App\Console\Commands;

use App\Services\AlertRuleEvaluator;
use Illuminate\Console\Command;

class CheckWeatherAlerts extends Command
{
    protected $signature = 'weather:check';

    protected $description = 'Check weather for all farms and create notifications for alerts (same as alerts:weather)';

    public function handle(AlertRuleEvaluator $evaluator): int
    {
        $this->info('Checking weather alerts for all farms...');
        $created = $evaluator->runExtremeWeather();
        $this->info("Weather check completed. Created {$created} new notifications.");

        return self::SUCCESS;
    }
}
