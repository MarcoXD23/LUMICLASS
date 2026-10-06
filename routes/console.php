<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Opcional: con "php artisan schedule:work" el sistema avanza aunque nadie mire el dashboard.
Schedule::command('lumiclass:tick')->everyTwoSeconds()->withoutOverlapping();
