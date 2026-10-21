<?php

return [
    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'webhook_url' => env('SLACK_WEBHOOK_URL'),
        ],
    ],

    'weather' => [
        'api_key' => env('OPENWEATHER_API_KEY'),
        'base_url' => env(
            'OPENWEATHER_BASE_URL',
            'https://api.openweathermap.org/data/2.5'
        ),
    ],

    'invitation' => [
        'frontend_url' => env('FRONTEND_URL', env('APP_URL')),
    ],
];
