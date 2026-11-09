<?php

namespace App\Services;

/**
 * Plain-language "what to do now" guidance for each stage of crop growth.
 *
 * The advice is general good practice that suits most field and vegetable crops.
 * It is a guide, not a replacement for an agronomist's advice on a specific crop.
 * The stage names match the Growth stage list on the monitoring form.
 */
class CropStageAdvisor
{
    private const STAGES = [
        'Germination' => [
            'Keep the soil evenly moist, but never waterlogged, so seeds can sprout.',
            'Check emergence every day and note any bare patches. Re-sow gaps early.',
            'Protect seeds and young shoots from birds, ants and cutworms.',
            'Do not apply heavy fertiliser yet.',
        ],
        'Seedling' => [
            'Water lightly and often. Roots are still shallow.',
            'Thin crowded seedlings and replace weak or missing plants.',
            'Weed by hand. Seedlings cannot compete with weeds.',
            'Look for damping-off, cutworms and aphids.',
        ],
        'Vegetative' => [
            'Top-dress with nitrogen as set out in your fertiliser plan to feed leaf growth.',
            'Weed again, and stake or earth up the crop where it needs support.',
            'Water deeply but less often so roots grow down.',
            'Scout every week for pests and leaf diseases, and treat early.',
        ],
        'Flowering' => [
            'Keep water steady. Water stress at flowering cuts yield the most.',
            'Avoid spraying while flowers are open. If you must, spray early morning or evening.',
            'Scout for flower and pod pests and for fungal disease.',
            'Ease off nitrogen. Move to potassium if your fertiliser plan allows.',
        ],
        'Fruiting' => [
            'Keep watering steady so fruit and grain fill evenly.',
            'Support heavy branches and remove damaged or diseased fruit.',
            'Keep scouting for fruit borers and rots.',
            'Check the pre-harvest interval on any pesticide before you spray.',
            'Start planning labour, containers, storage and transport for harvest.',
        ],
        'Maturity' => [
            'Check that the crop is ready and confirm your expected harvest date.',
            'Book labour and prepare containers, storage and transport.',
            'Reduce watering before harvest where the crop allows it.',
            'Harvest in the cool hours of the day, and record the yield afterwards.',
        ],
    ];

    private const HEALTH = [
        'Critical' => ['Urgent', 'Health is Critical. Inspect this crop in person today for pests, disease, and water or nutrient stress, and call your agronomist.'],
        'Poor' => ['High', 'Health is Poor. Scout this planting within the week for pests, disease, and water or nutrient stress, and treat early.'],
        'Fair' => ['Normal', 'Health is Fair. Keep a close watch and check again within a week.'],
    ];

    /**
     * @return array{stage: ?string, priority: string, steps: string[], next_stage: ?string}|null
     */
    public static function forRecord(?string $stage, ?string $health): ?array
    {
        $stage = isset(self::STAGES[$stage ?? '']) ? $stage : null;
        $healthRule = self::HEALTH[$health ?? ''] ?? null;

        if ($stage === null && $healthRule === null) {
            return null;
        }

        $steps = [];
        if ($healthRule) {
            $steps[] = $healthRule[1];
        }
        if ($stage !== null) {
            $steps = array_merge($steps, self::STAGES[$stage]);
        }

        $names = array_keys(self::STAGES);
        $index = $stage !== null ? array_search($stage, $names, true) : false;
        $next = ($index !== false && isset($names[$index + 1])) ? $names[$index + 1] : null;

        return [
            'stage' => $stage,
            'priority' => $healthRule[0] ?? 'Normal',
            'steps' => $steps,
            'next_stage' => $next,
        ];
    }
}
