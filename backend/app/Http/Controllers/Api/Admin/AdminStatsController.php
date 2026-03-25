<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\AdminLog;
use App\Models\Dispute;
use App\Models\DepositRequest;
use App\Models\Order;
use App\Models\PlatformWallet;
use App\Models\Report;
use App\Models\SellerVerification;
use App\Models\User;
use App\Models\UserSecurityLog;
use App\Models\WalletTransaction;
use App\Models\WithdrawRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminStatsController extends Controller
{
    /**
     * Comprehensive platform statistics for admin dashboard.
     */
    public function overview(Request $request): JsonResponse
    {
        $wallet = PlatformWallet::singleton();

        return $this->success([
            'users' => [
                'total'           => User::count(),
                'sellers'         => User::where('is_seller', true)->count(),
                'verified_sellers' => User::where('is_verified_seller', true)->count(),
                'buyers'          => User::where('is_seller', false)->where('is_admin', false)->count(),
                'banned'          => User::where('is_banned', true)->count(),
            ],
            'orders' => [
                'total'     => Order::count(),
                'completed' => Order::where('status', 'completed')->count(),
                'disputed'  => Order::where('status', 'disputed')->count(),
                'pending'   => Order::whereIn('status', ['pending', 'processing'])->count(),
                'delivered' => Order::where('status', 'delivered')->count(),
            ],
            'disputes' => [
                'total'        => Dispute::count(),
                'open'         => Dispute::where('status', 'open')->count(),
                'under_review' => Dispute::where('status', 'under_review')->count(),
                'resolved'     => Dispute::where('status', 'resolved')->count(),
                'refunded'     => Dispute::where('status', 'refunded')->count(),
            ],
            'moderation' => [
                'pending_reports'       => Report::where('status', 'pending')->count(),
                'pending_verifications' => SellerVerification::where('status', 'pending')->count(),
                'pending_deposits'      => DepositRequest::where('status', 'pending')->count(),
                'pending_withdraws'     => WithdrawRequest::where('status', 'pending')->count(),
            ],
            'platform' => [
                'total_revenue' => (float) $wallet->total_earned,
                'balance'       => (float) $wallet->balance,
            ],
        ]);
    }

    /**
     * Platform wallet balance + total earned + recent platform_fee transactions.
     */
    public function platformEarnings(Request $request): JsonResponse
    {
        $wallet = PlatformWallet::singleton();

        $recentFees = WalletTransaction::where('type', 'platform_fee')
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn ($t) => [
                'id'          => $t->id,
                'amount'      => (float) $t->amount,
                'description' => $t->description,
                'created_at'  => $t->created_at->toIso8601String(),
            ]);

        return $this->success([
            'balance'      => (float) $wallet->balance,
            'total_earned' => (float) $wallet->total_earned,
            'recent_fees'  => $recentFees,
        ]);
    }

    /**
     * Admin action logs with optional filters.
     */
    public function adminLogs(Request $request): JsonResponse
    {
        $query = AdminLog::with(['admin:id,name,email', 'targetUser:id,name,email'])
            ->latest();

        if ($request->has('action')) {
            $query->where('action', $request->action);
        }

        if ($request->has('admin_id')) {
            $query->where('admin_id', $request->admin_id);
        }

        $logs = $query->paginate(min($request->integer('per_page', 30), 100));

        return $this->success($logs);
    }

    /**
     * Security logs for suspicious activity monitoring.
     */
    public function securityLogs(Request $request): JsonResponse
    {
        $query = UserSecurityLog::with('user:id,name,email')
            ->latest();

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('action')) {
            $query->where('action', $request->action);
        }

        $logs = $query->paginate(min($request->integer('per_page', 30), 100));

        return $this->success($logs);
    }
}
