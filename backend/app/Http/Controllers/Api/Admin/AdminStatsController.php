<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\AdminLog;
use App\Models\PlatformWallet;
use App\Models\UserSecurityLog;
use App\Models\WalletTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminStatsController extends Controller
{
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

        $logs = $query->paginate($request->integer('per_page', 30));

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

        $logs = $query->paginate($request->integer('per_page', 30));

        return $this->success($logs);
    }
}
