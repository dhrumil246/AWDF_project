#!/usr/bin/env bash
# Assignment 3 — load test GET /cars with Apache Bench (ab).
# Usage: assignments/loadtest.sh [base-url] [requests] [concurrency...]
#   assignments/loadtest.sh http://127.0.0.1:5001 1000 10 50 100
# Needs a running API with the demo user (npm run seed) and `ab` (preinstalled on macOS).
set -euo pipefail

BASE=${1:-http://127.0.0.1:5001}
REQUESTS=${2:-1000}
shift 2 2>/dev/null || true
CONCURRENCY=("${@:-50}")

TOKEN=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"demo@cars.test","password":"demo12345"}' | python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])')

# One warm-up request (fills the cache when it is enabled)
curl -s -o /dev/null -D - "$BASE/cars" -H "Authorization: Bearer $TOKEN" | grep -i '^x-cache' || true

for c in "${CONCURRENCY[@]}"; do
  echo "=== ab -n $REQUESTS -c $c GET /cars ==="
  ab -q -n "$REQUESTS" -c "$c" -H "Authorization: Bearer $TOKEN" "$BASE/cars" |
    grep -E 'Complete requests|Failed requests|Non-2xx|Requests per second|Time per request|Transfer rate|Document Length|^ +(50|90|99|100)%'
done
