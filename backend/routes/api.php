<?php

use App\Http\Controllers\Api\Admin\AdminReportController;
use App\Http\Controllers\Api\Admin\AdminSellerController;
use App\Http\Controllers\Api\Admin\AdminSupportController;
use App\Http\Controllers\Api\Admin\AdminVerificationController;
use App\Http\Controllers\Api\Admin\DepositVerificationController;
use App\Http\Controllers\Api\Admin\WithdrawVerificationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\DepositRequestController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\SellerOrderController;
use App\Http\Controllers\Api\SellerProfileController;
use App\Http\Controllers\Api\SellerVerificationController;
use App\Http\Controllers\Api\SupportController;
use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Api\WithdrawRequestController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // ─── Public ─────────────────────────────────────────────────────────────
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/search', [ProductController::class, 'search']);
    Route::get('/products/{product}', [ProductController::class, 'show']);
    Route::get('/sellers/{seller}', [SellerProfileController::class, 'show']);

    // ─── Authenticated ───────────────────────────────────────────────────────
    Route::middleware(['auth:sanctum', 'update.last_activity'])->group(function () {

        // Auth / profile
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::patch('/me', [AuthController::class, 'updateMe']);

        // Wallet & funds
        Route::get('/wallet', [WalletController::class, 'show']);
        Route::post('/deposit-requests', [DepositRequestController::class, 'store']);
        Route::get('/deposit-requests', [DepositRequestController::class, 'index']);
        Route::post('/withdraw-requests', [WithdrawRequestController::class, 'store']);
        Route::get('/withdraw-requests', [WithdrawRequestController::class, 'index']);

        // Orders (buyer) — banned users cannot place orders
        Route::middleware('not.banned')->group(function () {
            Route::post('/orders', [OrderController::class, 'store']);
        });
        Route::get('/orders', [OrderController::class, 'index']);
        Route::get('/orders/{order}', [OrderController::class, 'show']);
        Route::patch('/orders/{order}/confirm-delivery', [OrderController::class, 'confirmDelivery']);

        // Reviews
        Route::post('/products/{product}/reviews', [ReviewController::class, 'store']);

        // Products (seller management) — banned sellers cannot manage products
        Route::middleware('not.banned')->group(function () {
            Route::get('/my-products', [ProductController::class, 'myIndex']);
            Route::post('/my-products', [ProductController::class, 'store']);
            Route::put('/my-products/{my_product}', [ProductController::class, 'update']);
            Route::patch('/my-products/{my_product}', [ProductController::class, 'update']);
            Route::delete('/my-products/{my_product}', [ProductController::class, 'destroy']);
        });

        // Seller order management — banned sellers cannot manage orders
        Route::middleware('not.banned')->group(function () {
            Route::get('/seller/orders', [SellerOrderController::class, 'index']);
            Route::get('/seller/orders/{order}', [SellerOrderController::class, 'show']);
            Route::patch('/seller/orders/{order}/status', [SellerOrderController::class, 'updateStatus']);
        });

        // Seller verification
        Route::post('/seller/verification-request', [SellerVerificationController::class, 'store']);
        Route::get('/seller/verification-request', [SellerVerificationController::class, 'show']);

        // Chat (regular conversations)
        Route::get('/conversations', [ConversationController::class, 'index']);
        Route::post('/conversations', [ConversationController::class, 'store']);
        Route::get('/conversations/{conversation}', [ConversationController::class, 'show']);
        Route::post('/conversations/{conversation}/messages', [ConversationController::class, 'storeMessage']);

        // Support chat (user-facing)
        Route::get('/support/conversation', [SupportController::class, 'getOrCreate']);
        Route::get('/support/messages', [SupportController::class, 'messages']);
        Route::post('/support/messages', [SupportController::class, 'sendMessage']);

        // Reports
        Route::post('/reports', [ReportController::class, 'store']);

        // Notifications
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    });

    // ─── Admin ───────────────────────────────────────────────────────────────
    Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {

        // Deposit & withdraw management
        Route::get('/deposit-requests', [DepositVerificationController::class, 'index']);
        Route::patch('/deposit-requests/{depositRequest}/verify', [DepositVerificationController::class, 'verify']);
        Route::get('/withdraw-requests', [WithdrawVerificationController::class, 'index']);
        Route::patch('/withdraw-requests/{withdrawRequest}/verify', [WithdrawVerificationController::class, 'verify']);

        // Reports management
        Route::get('/reports', [AdminReportController::class, 'index']);
        Route::post('/reports/{report}/resolve', [AdminReportController::class, 'resolve']);

        // Seller management (ban/unban)
        Route::post('/sellers/{seller}/ban', [AdminSellerController::class, 'ban']);
        Route::post('/sellers/{seller}/unban', [AdminSellerController::class, 'unban']);

        // Seller verification management
        Route::get('/verifications', [AdminVerificationController::class, 'index']);
        Route::post('/verifications/{verification}/approve', [AdminVerificationController::class, 'approve']);
        Route::post('/verifications/{verification}/reject', [AdminVerificationController::class, 'reject']);

        // Support chat management
        Route::get('/support-conversations', [AdminSupportController::class, 'index']);
        Route::get('/support-conversations/{conversation}', [AdminSupportController::class, 'show']);
        Route::post('/support-conversations/{conversation}/reply', [AdminSupportController::class, 'reply']);
    });
});
