<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->redirectGuestsTo(fn ($request) => null);
        $middleware->alias([
            'auth'                  => \App\Http\Middleware\Authenticate::class,
            'admin'                 => \App\Http\Middleware\EnsureUserIsAdmin::class,
            'not.banned'            => \App\Http\Middleware\EnsureSellerNotBanned::class,
            'check.ban'             => \App\Http\Middleware\CheckBanStatus::class,
            'update.last_activity'  => \App\Http\Middleware\UpdateUserLastActivity::class,
            'verified.email'        => \App\Http\Middleware\EnsureEmailVerified::class,
            'verified.sensitive'    => \App\Http\Middleware\EnsureEmailIsVerifiedForSensitiveActions::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(function ($request, $e) {
            return $request->is('api/*') || $request->expectsJson();
        });
    })->create();
