<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserSecurityLog;
use Illuminate\Http\Request;

class SecurityLogService
{
    public static function log(
        User $user,
        string $action,
        Request $request,
        array $metadata = []
    ): void {
        UserSecurityLog::create([
            'user_id'    => $user->id,
            'ip_address' => $request->ip(),
            'device'     => self::parseDevice($request->userAgent() ?? ''),
            'location'   => null, // can integrate a GeoIP package later
            'action'     => $action,
            'metadata'   => $metadata ?: null,
        ]);
    }

    private static function parseDevice(string $ua): string
    {
        if (stripos($ua, 'mobile') !== false) return 'mobile';
        if (stripos($ua, 'tablet') !== false) return 'tablet';
        if (stripos($ua, 'bot') !== false)    return 'bot';
        return 'desktop';
    }
}
