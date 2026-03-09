<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserSecurityLog;
use Illuminate\Http\Request;

class SecurityLogService
{
    /**
     * Log a security action for a user.
     */
    public static function log(
        User $user,
        string $action,
        Request $request,
        array $metadata = []
    ): UserSecurityLog {
        $ua      = $request->userAgent() ?? '';
        $ip      = $request->ip();
        $device  = self::parseDevice($ua);

        $log = UserSecurityLog::create([
            'user_id'    => $user->id,
            'ip_address' => $ip,
            'device'     => $device,
            'location'   => null,
            'country'    => null,   // GeoIP can be plugged in here later
            'user_agent' => substr($ua, 0, 500),
            'action'     => $action,
            'metadata'   => $metadata ?: null,
            'flagged'    => false,
            'flag_reason'=> null,
        ]);

        return $log;
    }

    /**
     * Check whether a newly registered user shares an IP or device
     * fingerprint with a currently-banned account.
     *
     * Returns an array of matching banned users (empty if no match).
     */
    public static function detectMultiAccount(User $newUser, Request $request): array
    {
        $ip     = $request->ip();
        $ua     = $request->userAgent() ?? '';
        $device = self::parseDevice($ua);

        // Find banned users who have logged in from the same IP
        $matchedByIp = UserSecurityLog::where('ip_address', $ip)
            ->where('action', 'login')
            ->where('user_id', '!=', $newUser->id)
            ->with('user')
            ->get()
            ->pluck('user')
            ->filter(fn ($u) => $u && $u->is_banned)
            ->unique('id')
            ->values()
            ->all();

        // Find banned users who have logged in from the same device type + partial UA
        $uaPrefix     = substr($ua, 0, 80);
        $matchedByUa  = [];
        if (strlen($uaPrefix) >= 20) {
            $matchedByUa = UserSecurityLog::where('user_agent', 'like', $uaPrefix . '%')
                ->where('action', 'login')
                ->where('user_id', '!=', $newUser->id)
                ->with('user')
                ->get()
                ->pluck('user')
                ->filter(fn ($u) => $u && $u->is_banned)
                ->unique('id')
                ->values()
                ->all();
        }

        return array_unique(
            array_merge($matchedByIp, $matchedByUa),
            SORT_REGULAR
        );
    }

    /**
     * Flag a security log entry and optionally flag the user's registration log.
     */
    public static function flagUser(User $user, string $reason): void
    {
        UserSecurityLog::where('user_id', $user->id)
            ->latest()
            ->limit(1)
            ->update(['flagged' => true, 'flag_reason' => $reason]);
    }

    private static function parseDevice(string $ua): string
    {
        if (stripos($ua, 'mobile') !== false) return 'mobile';
        if (stripos($ua, 'tablet') !== false) return 'tablet';
        if (stripos($ua, 'bot') !== false)    return 'bot';
        return 'desktop';
    }
}
