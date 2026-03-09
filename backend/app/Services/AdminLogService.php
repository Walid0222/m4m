<?php

namespace App\Services;

use App\Models\AdminLog;
use App\Models\User;

class AdminLogService
{
    public static function log(
        User $admin,
        string $action,
        string $description = '',
        ?int $targetUserId = null,
        ?int $targetProductId = null,
        ?int $targetOrderId = null
    ): AdminLog {
        return AdminLog::create([
            'admin_id'          => $admin->id,
            'action'            => $action,
            'target_user_id'    => $targetUserId,
            'target_product_id' => $targetProductId,
            'target_order_id'   => $targetOrderId,
            'description'       => $description,
        ]);
    }
}
