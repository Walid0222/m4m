<?php

use App\Http\Controllers\Api\Admin\DepositVerificationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\DepositRequestController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SellerOrderController;
use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Api\WithdrawRequestController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{product}', [ProductController::class, 'show']);

    // Authenticated
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);

        // Wallet & funds
        Route::get('/wallet', [WalletController::class, 'show']);
        Route::post('/deposit-requests', [DepositRequestController::class, 'store']);
        Route::get('/deposit-requests', [DepositRequestController::class, 'index']);
        Route::post('/withdraw-requests', [WithdrawRequestController::class, 'store']);
        Route::get('/withdraw-requests', [WithdrawRequestController::class, 'index']);

        // Products (seller)
        Route::get('/my-products', [ProductController::class, 'myIndex']);
        Route::post('/my-products', [ProductController::class, 'store']);
        Route::put('/my-products/{my_product}', [ProductController::class, 'update']);
        Route::patch('/my-products/{my_product}', [ProductController::class, 'update']);
        Route::delete('/my-products/{my_product}', [ProductController::class, 'destroy']);

        // Orders (buyer)
        Route::post('/orders', [OrderController::class, 'store']);
        Route::get('/orders', [OrderController::class, 'index']);
        Route::get('/orders/{order}', [OrderController::class, 'show']);

        // Seller order management
        Route::get('/seller/orders', [SellerOrderController::class, 'index']);
        Route::get('/seller/orders/{order}', [SellerOrderController::class, 'show']);
        Route::patch('/seller/orders/{order}/status', [SellerOrderController::class, 'updateStatus']);

        // Chat
        Route::get('/conversations', [ConversationController::class, 'index']);
        Route::post('/conversations', [ConversationController::class, 'store']);
        Route::get('/conversations/{conversation}', [ConversationController::class, 'show']);
        Route::post('/conversations/{conversation}/messages', [ConversationController::class, 'storeMessage']);
    });

    // Admin
    Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
        Route::get('/deposit-requests', [DepositVerificationController::class, 'index']);
        Route::patch('/deposit-requests/{depositRequest}/verify', [DepositVerificationController::class, 'verify']);
    });
});
