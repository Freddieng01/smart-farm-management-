<?php

return [
    'modules' => [
        'farms' => ['Admin', 'Farm-owner', 'Manager'],
        'fields' => ['Admin', 'Farm-owner', 'Manager', 'Agronomist'],
        'employees' => ['Farm-owner', 'Manager'],
        'tasks' => ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'],
        'agronomy' => ['Admin', 'Farm-owner', 'Manager', 'Agronomist'],
        'operations' => ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'],
        'inventory' => ['Admin', 'Farm-owner', 'Manager', 'Agronomist'],
        'equipment' => ['Admin', 'Farm-owner', 'Manager'],
        'finance' => ['Farm-owner', 'Manager', 'Accountant'],
        'commercial' => ['Farm-owner', 'Manager', 'Accountant'],
        'storage' => ['Admin', 'Farm-owner', 'Manager', 'Accountant', 'Worker'],
        'weather' => ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker', 'Accountant'],
        'notifications' => ['Admin', 'Farm-owner', 'Manager', 'Accountant', 'Agronomist', 'Worker'],
    ],

    'write_roles' => [
        'farms' => ['Farm-owner', 'Manager'],
        'fields' => ['Farm-owner', 'Manager'],
        'employees' => ['Farm-owner', 'Manager'],
        'tasks' => ['Farm-owner', 'Manager', 'Agronomist', 'Worker'],
        'agronomy' => ['Farm-owner', 'Manager', 'Agronomist'],
        'operations' => ['Farm-owner', 'Manager', 'Agronomist', 'Worker'],
        'inventory' => ['Farm-owner', 'Manager', 'Agronomist'],
        'equipment' => ['Farm-owner', 'Manager'],
        'finance' => ['Farm-owner', 'Manager', 'Accountant'],
        'commercial' => ['Farm-owner', 'Manager', 'Accountant'],
        'storage' => ['Farm-owner', 'Manager', 'Accountant', 'Worker'],
        'weather' => [],
        'notifications' => ['Farm-owner', 'Manager'],
    ],
];
