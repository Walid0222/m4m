<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Wallet;

class WalletController extends Controller
{
    public function getBalance($userId)
    {
        $wallet = Wallet::where('user_id', $userId)->first();

        if (!$wallet) {
            return response()->json([
                'message' => 'Wallet not found'
            ], 404);
        }

        return response()->json([
            'balance' => $wallet->balance
        ]);
    }

    
}