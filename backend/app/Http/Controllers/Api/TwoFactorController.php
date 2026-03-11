<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Services\SecurityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use OTPHP\TOTP;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;

class TwoFactorController extends Controller
{
    public function enable(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        // Create TOTP instance and generate secret + provisioning URI
        $totp = TOTP::create();
        $totp->setLabel($user->email);
        $totp->setIssuer('M4M');

        $secret = $totp->getSecret();
        $uri    = $totp->getProvisioningUri();

        // Generate QR code PNG (base64) for the provisioning URI using endroid/qr-code v6
        $qrCode = new QrCode(
            data: $uri,
            size: 240,
            margin: 4
        );

        $writer = new PngWriter();
        $result = $writer->write($qrCode);

        $qrBase64 = 'data:image/png;base64,' . base64_encode($result->getString());

        // Store secret encrypted but don't mark enabled yet
        $user->two_factor_secret = Crypt::encryptString($secret);
        $user->two_factor_enabled_at = null;
        $user->save();

        SecurityLogService::log($user, '2fa_enable_started', $request);

        return $this->success([
            'secret'   => $secret,
            'qr_code'  => $qrBase64,
        ], 'Scan this QR code with your authenticator app, then confirm with a code.');
    }

    public function confirm(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $data = $request->validate([
            'code' => ['required', 'string'],
        ]);

        if (! $user->two_factor_secret) {
            return $this->error('2FA has not been initiated.', 422);
        }

        $secret = Crypt::decryptString($user->two_factor_secret);
        $totp = TOTP::create($secret);

        if (! $totp->verify($data['code'])) {
            return $this->error('Invalid 2FA code.', 422);
        }

        $user->two_factor_enabled_at = now();
        $user->save();

        SecurityLogService::log($user, '2fa_enabled', $request);

        return $this->success(null, 'Two-factor authentication enabled.');
    }

    public function disable(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $data = $request->validate([
            'password' => ['required'],
            'code'     => ['required', 'string'],
        ]);

        if (! \Illuminate\Support\Facades\Hash::check($data['password'], $user->password)) {
            return $this->error('Invalid password.', 422);
        }

        if (! $user->two_factor_secret || ! $user->two_factor_enabled_at) {
            return $this->error('Two-factor authentication is not enabled.', 422);
        }

        $secret = Crypt::decryptString($user->two_factor_secret);
        $totp = TOTP::create($secret);

        if (! $totp->verify($data['code'])) {
            return $this->error('Invalid 2FA code.', 422);
        }

        $user->two_factor_secret = null;
        $user->two_factor_enabled_at = null;
        $user->save();

        SecurityLogService::log($user, '2fa_disabled', $request);

        return $this->success(null, 'Two-factor authentication disabled.');
    }
}

