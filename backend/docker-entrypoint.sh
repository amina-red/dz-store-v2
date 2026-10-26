#!/bin/sh
# Prepares the API every time the container starts, then runs the server.
set -e

# In development the code folder is mounted from your PC, so vendor/ may be missing.
if [ ! -f vendor/autoload_runtime.php ]; then
  echo "Installing PHP packages..."
  composer install --no-interaction --prefer-dist
fi

echo "Waiting for the database..."
tries=0
until php bin/console dbal:run-sql "SELECT 1" > /tmp/db-check.log 2>&1; do
  tries=$((tries + 1))
  if [ "$tries" -ge 30 ]; then
    echo "The database check failed 30 times. Last error:" >&2
    cat /tmp/db-check.log >&2
    exit 1
  fi
  sleep 2
done

# First run only: create the first migration from the entities.
# Commit the generated file in backend/migrations/ to Git.
if [ -z "$(ls -A migrations/*.php 2>/dev/null)" ]; then
  echo "No migration yet: generating the first one from the entities..."
  php bin/console doctrine:migrations:diff --no-interaction --allow-empty-diff
fi

php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration
php bin/console app:seed ${SEED_OPTIONS:-}

if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  php bin/console app:create-admin --from-env
fi

mkdir -p public/uploads/products

exec "$@"
