<?php

return [
    'default' => env('CACHE_STORE', 'database'),
    'stores' => [
        'database' => [
            'driver' => 'database',
            'table' => env('CACHE_TABLE', 'cache'),
            'lock_table' => env('CACHE_LOCK_TABLE', 'cache_locks'),
            'connection' => env('CACHE_CONNECTION'),
        ],
        'file' => [
            'driver' => 'file',
            'path' => storage_path('framework/cache/data'),
        ],
    ],
    'prefix' => env('CACHE_PREFIX', ''),
];
