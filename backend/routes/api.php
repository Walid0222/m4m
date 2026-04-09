<?php

use App\Http\Controllers\Api\Admin\AdminEscrowController;
use App\Http\Controllers\Api\Admin\AdminDisputeController;
use App\Http\Controllers\Api\Admin\AdminOfferTypeController;
use App\Http\Controllers\Api\Admin\AdminReportController;
use App\Http\Controllers\Api\Admin\AdminServiceController;
use App\Http\Controllers\Api\Admin\AdminServiceRequestController;
use App\Http\Controllers\Api\Admin\AdminSellerController;
use App\Http\Controllers\Api\Admin\AdminAffiliateController;
use App\Http\Controllers\Api\Admin\AdminStatsController;
use App\Http\Controllers\Api\Admin\AdminSupportController;
use App\Http\Controllers\Api\Admin\AdminVerificationController;
use App\Http\Controllers\Api\Admin\AdminVerificationRequestController;
use App\Http\Controllers\Api\Admin\AdminAnnouncementController;
use App\Http\Controllers\Api\Admin\AdminCouponController;
use App\Http\Controllers\Api\Admin\DepositVerificationController;
use App\Http\Controllers\Api\Admin\WithdrawVerificationController;
use App\Http\Controllers\Api\Admin\WalletSettingsController as AdminWalletSettingsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\AffiliateController;
use App\Http\Controllers\Api\CouponController;
use App\Http\Controllers\Api\DebugEscrowController;
use App\Http\Controllers\Api\DepositRequestController;
use App\Http\Controllers\Api\DisputeController;
use App\Http\Controllers\Api\DisputeEvidenceController;
use App\Http\Controllers\Api\DisputeMessageController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\Auth\EmailVerificationController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\MarketplaceController;
use App\Http\Controllers\Api\OfferTypeController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\ServiceRequestController;
use App\Http\Controllers\Api\SellerEscrowController;
use App\Http\Controllers\Api\SellerAutoReplyController;
use App\Http\Controllers\Api\SellerOrderController;
use App\Http\Controllers\Api\SellerVacationController;
use App\Http\Controllers\Api\SellerProfileController;
use App\Http\Controllers\Api\SellerVerificationController;
use App\Http\Controllers\Api\SellerWarningsController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\SupportController;
use App\Http\Controllers\Api\TwoFactorController;
use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Api\WalletSettingsController;
use App\Http\Controllers\Api\WithdrawRequestController;
use App\Http\Controllers\Api\SettingsController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;

RateLimiter::for('auth', function (Request $request) {
    return Limit::perMinute(5)->by(
        $request->ip() . '|' . (string) $request->input('email')
    );
});

// Throttle high-churn dispute endpoints to reduce spam / abuse
RateLimiter::for('dispute-messages', function (Request $request) {
    $userKey = optional($request->user())->id ?: 'guest';
    return [
        Limit::perMinute(30)->by($userKey),
        Limit::perMinute(60)->by($request->ip()),
    ];
});

RateLimiter::for('dispute-evidence', function (Request $request) {
    $userKey = optional($request->user())->id ?: 'guest';
    return [
        Limit::perMinute(10)->by($userKey),
        Limit::perMinute(20)->by($request->ip()),
    ];
});

// Alias for clients calling /api/categories (without v1)
Route::get('/categories', [CategoryController::class, 'index']);

Route::prefix('v1')->group(function () {

    // ─── Public ─────────────────────────────────────────────────────────────
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth');
    Route::post('/login',    [AuthController::class, 'login'])->middleware('throttle:auth');
    Route::post('/login/2fa',[AuthController::class, 'login2fa'])->middleware('throttle:auth');
    Route::post('/auth/google', [AuthController::class, 'loginGoogle'])->middleware('throttle:auth');

    Route::post('/forgot-password', [PasswordResetController::class, 'forgotPassword'])
        ->middleware('throttle:6,1');
    Route::post('/reset-password', [PasswordResetController::class, 'resetPassword'])
        ->middleware('throttle:6,1');

    Route::get('/categories',                      [CategoryController::class, 'index']);
    Route::get('/services',                        [ServiceController::class, 'index']);
    Route::get('/services/{service}',              [ServiceController::class, 'show']);
    Route::get('/offer-types',                     [OfferTypeController::class, 'index']);
    Route::get('/offer-types/search',              [OfferTypeController::class, 'search']);
    Route::get('/offer-types/{offer_type}',        [OfferTypeController::class, 'show']);

    Route::get('/products',                 [ProductController::class, 'index']);
    Route::get('/products/search',          [ProductController::class, 'search']);
    Route::get('/products/best-selling',   [ProductController::class, 'bestSelling']);
    Route::get('/products/trending',        [ProductController::class, 'trending']);
    Route::get('/products/{product}',       [ProductController::class, 'show']);
    Route::get('/products/{product}/recommended', [ProductController::class, 'recommended']);

    Route::get('/sellers/{seller}',              [SellerProfileController::class, 'show']);
    Route::get('/sellers/{seller}/stats',        [StatsController::class, 'publicSellerStats']);
    Route::get('/reviews',                       [ReviewController::class, 'index']);

    // Announcements
    Route::get('/announcements', [AnnouncementController::class, 'index']);
    Route::get('/marketplace/stats', [MarketplaceController::class, 'stats']);

    // ─── Authenticated ───────────────────────────────────────────────────────
    // Public + low-auth email verification for SPA (no redirects)
    Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::middleware(['auth:sanctum', 'update.last_activity', 'check.ban'])->group(function () {

        // Auth / profile
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me',      [AuthController::class, 'me']);
        Route::patch('/me',    [AuthController::class, 'updateMe']);
        Route::post('/me/avatar', [AuthController::class, 'uploadAvatar']);

        Route::post('/email/resend', [EmailVerificationController::class, 'resend'])
            ->middleware('throttle:6,1')
            ->name('verification.resend');

        // Settings endpoint (non-critical, but requires authentication)
        Route::get('/settings', [SettingsController::class, 'show']);

        // All marketplace features require a verified email.
        Route::middleware('verified.email')->group(function () {

        // Wallet & funds
            Route::get('/wallet',                                        [WalletController::class, 'show']);
            Route::get('/wallet/transactions',                           [WalletController::class, 'transactions']);
            Route::get('/wallet/settings',                               [WalletSettingsController::class, 'show']);
            Route::post('/deposit-requests',                             [DepositRequestController::class, 'store']);
            Route::get('/deposit-requests',                              [DepositRequestController::class, 'index']);
            Route::post('/withdraw-requests',                            [WithdrawRequestController::class, 'store'])->middleware('throttle:10,1');
            Route::get('/withdraw-requests',                             [WithdrawRequestController::class, 'index']);

            // Security / 2FA (optional, but only for verified users)
            Route::post('/security/2fa/enable',  [TwoFactorController::class, 'enable']);
            Route::post('/security/2fa/confirm', [TwoFactorController::class, 'confirm']);
            Route::post('/security/2fa/disable', [TwoFactorController::class, 'disable']);

            // Products (seller management) — banned sellers blocked
            Route::middleware('not.banned')->group(function () {
                Route::get('/my-products',                            [ProductController::class, 'myIndex']);
                Route::post('/my-products',                           [ProductController::class, 'store']);
                Route::put('/my-products/{my_product}',               [ProductController::class, 'update']);
                Route::patch('/my-products/{my_product}',             [ProductController::class, 'update']);
                Route::delete('/my-products/{my_product}',            [ProductController::class, 'destroy']);
                Route::post('/products/{product}/pin',                [ProductController::class, 'pin']);

                // Instant-delivery account stock
                Route::post('/seller/products/{my_product}/accounts', [ProductController::class, 'addAccounts']);
                Route::get('/seller/products/{my_product}/accounts',  [ProductController::class, 'listAccounts']);

                // Service requests (seller requests new offer types)
                Route::get('/service-requests',   [ServiceRequestController::class, 'index']);
                Route::post('/service-requests',  [ServiceRequestController::class, 'store']);
            });

            // Orders (buyer) — banned users cannot place orders
            Route::middleware('not.banned')->group(function () {
        Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:60,1');
            });
            Route::get('/orders',                              [OrderController::class, 'index']);
            Route::get('/orders/{order}',                      [OrderController::class, 'show']);
            Route::patch('/orders/{order}/confirm-delivery',   [OrderController::class, 'confirmDelivery']);

            // Coupon preview (apply at checkout)
            Route::post('/coupons/preview', [CouponController::class, 'preview']);

            // ─── Debug (testing only) ─────────────────────────────────────────
            if (app()->environment('local')) {
                // TEMP: releases the latest order escrow immediately for payout testing.
                // IMPORTANT: this route must be removed once testing is complete.
                Route::post('/debug/release-latest-order', [DebugEscrowController::class, 'releaseLatestHeldOrder'])
                    ->middleware('admin');

                // ─── SAFE Debug (testing only) ─────────────────────────────────────
                // TEMP: force-release only the latest order when it is eligible (`escrow_status=held`).
                // IMPORTANT: this route must be removed before production.
                Route::post('/debug/force-release-latest', [DebugEscrowController::class, 'forceReleaseLatest'])
                    ->middleware('admin');
            }

            // Affiliate / referral
            Route::get('/affiliate/dashboard', [AffiliateController::class, 'dashboard']);
            Route::post('/referral-code/create', [AffiliateController::class, 'createReferralCode']);

            // Disputes (buyer, seller, admin)
            Route::post('/disputes',          [DisputeController::class, 'store']);
            Route::get('/disputes',           [DisputeController::class, 'index']);
            Route::get('/disputes/{dispute}', [DisputeController::class, 'show']);
            Route::get('/disputes/{dispute}/activities', [DisputeController::class, 'activities']);
            Route::get('/disputes/{dispute}/messages',   [DisputeMessageController::class, 'index']);
            Route::post('/disputes/{dispute}/messages',  [DisputeMessageController::class, 'store'])
                ->middleware('throttle:dispute-messages');
            Route::get('/disputes/{dispute}/evidence',              [DisputeEvidenceController::class, 'index']);
            Route::post('/disputes/{dispute}/evidence',             [DisputeEvidenceController::class, 'store'])
                ->middleware('throttle:dispute-evidence');
            Route::get('/disputes/{dispute}/evidence/{evidence}/file', [DisputeEvidenceController::class, 'showFile']);

            // Reviews
            Route::post('/products/{product}/reviews', [ReviewController::class, 'store']);

            // Seller order management — banned sellers blocked
            Route::middleware('not.banned')->group(function () {
                Route::get('/seller/orders',                          [SellerOrderController::class, 'index']);
                Route::get('/seller/orders/{order}',                  [SellerOrderController::class, 'show']);
                Route::patch('/seller/orders/{order}/status',         [SellerOrderController::class, 'updateStatus']);
                Route::patch('/seller/orders/{order}/note',           [SellerOrderController::class, 'updateNote']);
                Route::post('/seller/orders/{order}/deliver',         [SellerOrderController::class, 'deliver']);
            });

            // Seller verification
            Route::post('/seller/verification-request', [SellerVerificationController::class, 'store']);
            Route::get('/seller/verification-request',  [SellerVerificationController::class, 'show']);

            // Seller warnings + moderation status (authenticated seller)
            Route::get('/seller/warnings',                 [SellerWarningsController::class, 'index']);
            Route::post('/seller/warnings/{warning}/dismiss', [SellerWarningsController::class, 'dismiss']);
            Route::get('/seller/moderation-status',        [SellerWarningsController::class, 'status']);
            Route::post('/seller/vacation-mode',      [SellerVacationController::class, 'toggle']);

            // Seller escrow (seller only)
            Route::get('/seller/escrow', [SellerEscrowController::class, 'index']);

            // Stats
            Route::get('/stats/seller', [StatsController::class, 'sellerStats']);
            Route::get('/stats/buyer',  [StatsController::class, 'buyerStats']);

            // Chat (regular conversations)
            Route::get('/conversations',                                  [ConversationController::class, 'index']);
            Route::get('/conversations/unread-total',                     [ConversationController::class, 'totalUnread']);
            Route::post('/conversations',                                 [ConversationController::class, 'store']);
            Route::get('/conversations/{conversation}',                   [ConversationController::class, 'show']);
            Route::post('/conversations/{conversation}/messages',         [ConversationController::class, 'storeMessage'])->middleware('throttle:120,1');
            Route::post('/conversations/{conversation}/typing',           [ConversationController::class, 'typing']);
            Route::post('/conversations/{conversation}/seen',             [ConversationController::class, 'seen']);

            // Support chat (user-facing)
            Route::get('/support/conversation',  [SupportController::class, 'getOrCreate']);
            Route::get('/support/messages',      [SupportController::class, 'messages']);
            Route::post('/support/messages',     [SupportController::class, 'sendMessage']);

            // Favorites / Wishlist
            Route::get('/favorites',             [FavoriteController::class, 'index']);
            Route::get('/favorites/ids',         [FavoriteController::class, 'ids']);
            Route::post('/favorites/{product}',  [FavoriteController::class, 'toggle']);
            Route::delete('/favorites/{product}',[FavoriteController::class, 'destroy']);

            // Seller auto-reply message
            Route::get('/seller/auto-reply',  [SellerAutoReplyController::class, 'show']);
            Route::put('/seller/auto-reply',  [SellerAutoReplyController::class, 'update']);

            // Reports
            Route::post('/reports', [ReportController::class, 'store']);

            // Notifications
            Route::get('/notifications',                   [NotificationController::class, 'index']);
            Route::patch('/notifications/{id}/read',       [NotificationController::class, 'markAsRead']);
            Route::post('/notifications/read-all',         [NotificationController::class, 'markAllAsRead']);
        });
    });

    // ─── Admin ───────────────────────────────────────────────────────────────
    Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {

        // Deposit & withdraw management
        Route::get('/deposit-requests',                                    [DepositVerificationController::class, 'index']);
        Route::patch('/deposit-requests/{depositRequest}/verify',          [DepositVerificationController::class, 'verify']);
        Route::get('/withdraw-requests',                                   [WithdrawVerificationController::class, 'index']);
        Route::patch('/withdraw-requests/{withdrawRequest}/verify',        [WithdrawVerificationController::class, 'verify']);

        // Wallet settings
        Route::get('/wallet-settings',                                     [AdminWalletSettingsController::class, 'show']);
        Route::patch('/wallet-settings',                                   [AdminWalletSettingsController::class, 'update']);

        // Reports moderation
        // GET   /admin/reports             — list (supports ?status= ?type= filters)
        // PATCH /admin/reports/{id}        — React frontend shape { action }
        // POST  /admin/reports/{id}/resolve — backward compat
        // POST  /admin/reports/{id}/action  — explicit action alias per spec
        Route::get('/reports',                         [AdminReportController::class, 'index']);
        Route::patch('/reports/{report}',              [AdminReportController::class, 'update']);
        Route::post('/reports/{report}/resolve',       [AdminReportController::class, 'resolve']);
        Route::post('/reports/{report}/action',        [AdminReportController::class, 'action']);

        // Seller management — list + detail
        Route::get('/sellers',                                  [AdminSellerController::class, 'index']);
        Route::get('/sellers/{seller}',                         [AdminSellerController::class, 'show']);

        // Moderation actions
        Route::post('/sellers/{seller}/warn',                   [AdminSellerController::class, 'warn']);
        Route::post('/sellers/{seller}/temporary-ban',          [AdminSellerController::class, 'temporaryBan']);
        Route::post('/sellers/{seller}/permanent-ban',          [AdminSellerController::class, 'permanentBan']);
        Route::post('/sellers/{seller}/ban',                    [AdminSellerController::class, 'ban']);   // backward compat
        Route::post('/sellers/{seller}/unban',                  [AdminSellerController::class, 'unban']);
        Route::get('/sellers/{seller}/warnings',                [AdminSellerController::class, 'warnings']);
        Route::get('/sellers/{seller}/moderation-history',      [AdminSellerController::class, 'moderationHistory']);

        // Seller verification — new-style separate endpoints
        Route::get('/verifications',                               [AdminVerificationController::class, 'index']);
        Route::post('/verifications/{verification}/approve',       [AdminVerificationController::class, 'approve']);
        Route::post('/verifications/{verification}/reject',        [AdminVerificationController::class, 'reject']);

        // Seller verification — frontend-compatible shape
        // GET  /admin/verification-requests          — list (all statuses)
        // PATCH /admin/verification-requests/{id}   — { action: 'approved'|'rejected' }
        Route::get('/verification-requests',           [AdminVerificationRequestController::class, 'index']);
        Route::patch('/verification-requests/{id}',    [AdminVerificationRequestController::class, 'update']);

        // Support chat
        Route::get('/support-conversations',                                        [AdminSupportController::class, 'index']);
        Route::get('/support-conversations/{conversation}',                         [AdminSupportController::class, 'show']);
        Route::get('/support-conversations/{conversation}/messages',                [AdminSupportController::class, 'messages']);
        Route::post('/support-conversations/{conversation}/reply',                  [AdminSupportController::class, 'reply']);

        // Escrow monitoring
        Route::get('/escrow',                              [AdminEscrowController::class, 'index']);
        Route::post('/orders/{order}/release',             [AdminEscrowController::class, 'release']);
        Route::post('/orders/{order}/hold',                [AdminEscrowController::class, 'hold']);
        Route::post('/orders/{order}/refund',              [AdminEscrowController::class, 'refund']);

        // Disputes
        Route::get('/disputes',                        [AdminDisputeController::class, 'index']);
        Route::get('/disputes/{dispute}',              [AdminDisputeController::class, 'show']);
        Route::post('/disputes/{dispute}/resolve',     [AdminDisputeController::class, 'resolve']);
        Route::post('/disputes/{dispute}/release',     [AdminDisputeController::class, 'release']);
        Route::post('/disputes/{dispute}/refund',      [AdminDisputeController::class, 'refund']);

        // Platform stats, logs, earnings
        Route::get('/stats',              [AdminStatsController::class, 'overview']);
        Route::get('/platform-earnings',  [AdminStatsController::class, 'platformEarnings']);
        Route::get('/admin-logs',         [AdminStatsController::class, 'adminLogs']);
        Route::get('/security-logs',      [AdminStatsController::class, 'securityLogs']);

        // Affiliates (referral system)
        Route::get('/affiliates', [AdminAffiliateController::class, 'index']);

        // Coupons
        Route::get('/coupons',    [AdminCouponController::class, 'index']);
        Route::post('/coupons',   [AdminCouponController::class, 'store']);
        Route::delete('/coupons/{coupon}', [AdminCouponController::class, 'destroy']);

        // Service requests (sellers requesting new offer types)
        Route::get('/service-requests',                              [AdminServiceRequestController::class, 'index']);
        Route::put('/service-requests/{service_request}',           [AdminServiceRequestController::class, 'update']);
        Route::patch('/service-requests/{service_request}',         [AdminServiceRequestController::class, 'update']);
        Route::delete('/service-requests/{service_request}',        [AdminServiceRequestController::class, 'destroy']);
        Route::post('/service-requests/{service_request}/approve',  [AdminServiceRequestController::class, 'approve']);
        Route::post('/service-requests/{service_request}/reject',    [AdminServiceRequestController::class, 'reject']);

        // Services (top-level catalog)
        Route::get('/services',           [AdminServiceController::class, 'index']);
        Route::post('/services',         [AdminServiceController::class, 'store']);
        Route::put('/services/{id}',     [AdminServiceController::class, 'update']);
        Route::patch('/services/{id}',   [AdminServiceController::class, 'update']);
        Route::delete('/services/{id}',   [AdminServiceController::class, 'destroy']);

        // Service catalog (offer types) management — by id
        Route::get('/offer-types',                [AdminOfferTypeController::class, 'index']);
        Route::post('/offer-types',               [AdminOfferTypeController::class, 'store']);
        Route::get('/offer-types/{id}',          [AdminOfferTypeController::class, 'show']);
        Route::put('/offer-types/{id}',           [AdminOfferTypeController::class, 'update']);
        Route::patch('/offer-types/{id}',         [AdminOfferTypeController::class, 'update']);
        Route::delete('/offer-types/{id}',        [AdminOfferTypeController::class, 'destroy']);

        // Announcements
        Route::get('/announcements',           [AdminAnnouncementController::class, 'index']);
        Route::post('/announcements',          [AdminAnnouncementController::class, 'store']);
        Route::put('/announcements/{announcement}', [AdminAnnouncementController::class, 'update']);
        Route::patch('/announcements/{announcement}', [AdminAnnouncementController::class, 'update']);
        Route::delete('/announcements/{announcement}', [AdminAnnouncementController::class, 'destroy']);
    });
});
