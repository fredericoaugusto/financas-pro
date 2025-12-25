#!/bin/sh
set -e

echo "🚀 Starting Laravel Production Server..."

# Run migrations (with --force for production)
echo "📦 Running database migrations..."
php artisan migrate --force

# Clear and cache configuration
echo "⚡ Optimizing for production..."
php artisan config:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Create storage link if not exists
if [ ! -L "public/storage" ]; then
    echo "🔗 Creating storage link..."
    php artisan storage:link
fi

# Ensure storage directories have correct permissions
echo "🔐 Setting permissions..."
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

echo "✅ Application ready!"
echo "📡 Starting Supervisor..."

# Start supervisor (which manages nginx, php-fpm, and scheduler)
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
