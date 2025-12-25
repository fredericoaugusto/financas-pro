<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Health Check Routes
|--------------------------------------------------------------------------
| These routes are used by load balancers and container orchestrators
| to verify the application is running correctly.
|
*/

Route::get('/health', function () {
    $status = [
        'status' => 'ok',
        'timestamp' => now()->toIso8601String(),
        'app' => config('app.name'),
        'environment' => config('app.env'),
    ];

    // Check database connectivity
    try {
        \DB::connection()->getPdo();
        $status['database'] = 'connected';
    } catch (\Exception $e) {
        $status['database'] = 'error';
        $status['status'] = 'degraded';
    }

    $httpStatus = $status['status'] === 'ok' ? 200 : 503;

    return response()->json($status, $httpStatus);
});
