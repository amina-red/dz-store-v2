# DZ Store API: PHP 8.3 with the PostgreSQL driver, plus Composer.
FROM php:8.3-cli-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libpq-dev libicu-dev libzip-dev \
    && docker-php-ext-install pdo_pgsql intl zip opcache \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

RUN { \
      echo 'date.timezone=Africa/Algiers'; \
      echo 'upload_max_filesize=6M'; \
      echo 'post_max_size=8M'; \
      echo 'memory_limit=256M'; \
    } > /usr/local/etc/php/conf.d/dz-store.ini

WORKDIR /app

# Install dependencies first so Docker can cache them between code changes.
COPY composer.json composer.lock* ./
RUN composer install --no-interaction --no-scripts --prefer-dist

COPY . .
RUN composer dump-autoload --optimize && chmod +x docker-entrypoint.sh bin/console

EXPOSE 8000
ENTRYPOINT ["./docker-entrypoint.sh"]

# PHP's built-in server: fine for development and a small demo.
# For a busy real shop, run it behind FrankenPHP or Nginx + PHP-FPM instead.
# Render and similar hosts give the port in $PORT; locally it is 8000.
CMD ["sh", "-c", "exec php -S 0.0.0.0:${PORT:-8000} -t public"]
