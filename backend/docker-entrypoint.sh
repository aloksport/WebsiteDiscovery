#!/bin/sh
set -e

echo "Running database migrations..."
npx knex migrate:latest --knexfile knexfile.js

echo "Starting server..."
exec node dist/index.js
