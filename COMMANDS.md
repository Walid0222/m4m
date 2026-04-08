# 🚀 M4M — Useful Commands

## 🧱 Setup (First time / After clone)

cd backend

# Install dependencies
composer install

# Copy env
cp .env.example .env

# Generate key
php artisan key:generate

# Run migrations + seed catalog
php artisan migrate --seed

---

## 🔁 Development (Local)

# Reset database (⚠️ deletes everything)
php artisan migrate:fresh --seed

# Run Laravel server
php artisan serve

# Run queue worker
php artisan queue:work

# Run scheduler (optional)
php artisan schedule:work

# Run reverb (websockets / realtime)
php artisan reverb:start

---

## 📦 Production / Deployment

cd backend

# Install dependencies
composer install --optimize-autoloader --no-dev

# Cache config
php artisan config:cache

# Cache routes
php artisan route:cache

# Cache views
php artisan view:cache

# Run migrations (safe)
php artisan migrate --seed

---

## 🧹 Cache & Fixes

# Clear all cache
php artisan optimize:clear

# Clear specific caches
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear

---

## 👤 Admin Creation (Manual)

php artisan tinker

use App\Models\User;
use Illuminate\Support\Facades\Hash;

User::updateOrCreate(
    ['email' => 'admin@admin.com'],
    [
        'name' => 'Admin',
        'password' => Hash::make('admin1234'),
        'is_admin' => true,
        'is_seller' => false,
        'email_verified_at' => now(),
    ]
);

---

## 🔍 Debug

# Check routes
php artisan route:list

# Check logs
tail -f storage/logs/laravel.log

---

## ⚠️ Important Notes

- NEVER run `migrate:fresh` in production ❌
- Always commit seeders before deploy ✔️
- Use `migrate --seed` for safe updates ✔️