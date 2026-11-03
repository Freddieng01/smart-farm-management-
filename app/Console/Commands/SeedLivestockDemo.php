<?php

namespace App\Console\Commands;

use App\Models\Farm;
use App\Models\Livestock;
use Illuminate\Console\Command;

class SeedLivestockDemo extends Command
{
    protected $signature = 'livestock:demo-production {--farm= : Farm id to add the demo flocks to} {--fresh : Remove the demo flocks first}';

    protected $description = 'Create two demo chicken flocks with 60 days of egg production, for demos and testing.';

    public function handle(): int
    {
        $farm = $this->option('farm') ? Farm::find($this->option('farm')) : Farm::query()->first();

        if (! $farm) {
            $this->error('No farm found. Create a farm first, or pass --farm=ID.');

            return self::FAILURE;
        }

        if ($this->option('fresh')) {
            Livestock::whereIn('tag_number', ['DEMO-FLOCK-A', 'DEMO-FLOCK-B'])->delete();
        }

        mt_srand(42);

        // tag, breed, birds, laying rate at the start, laying rate now
        $flocks = [
            ['DEMO-FLOCK-A', 'Isa Brown', 200, 0.62, 0.88],
            ['DEMO-FLOCK-B', 'Black Australorp', 120, 0.55, 0.74],
        ];

        foreach ($flocks as [$tag, $breed, $birds, $from, $to]) {
            $flock = Livestock::updateOrCreate(
                ['tag_number' => $tag],
                [
                    'farm_id' => $farm->id,
                    'species' => 'Chicken',
                    'breed' => $breed,
                    'sex' => 'Female',
                    'status' => 'Active',
                    'head_count' => $birds,
                    'birth_date' => now()->subMonths(8)->toDateString(),
                ]
            );

            $flock->productionRecords()->delete();

            for ($i = 59; $i >= 0; $i--) {
                $progress = (59 - $i) / 59;
                $rate = $from + ($to - $from) * $progress + (mt_rand(-30, 30) / 1000);

                $flock->productionRecords()->create([
                    'product' => 'Eggs',
                    'quantity' => max(0, round($birds * $rate)),
                    'unit' => 'eggs',
                    'date_recorded' => now()->subDays($i)->toDateString(),
                ]);
            }

            $this->info("Created {$tag} ({$birds} birds) with 60 days of eggs.");
        }

        return self::SUCCESS;
    }
}
