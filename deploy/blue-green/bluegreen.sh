#!/usr/bin/env bash
# Blue-green helper. Run from the repository root.
#   deploy/blue-green/bluegreen.sh up            start mongodb, blue, green and the proxy (blue live)
#   deploy/blue-green/bluegreen.sh status        which colour is live + /health of both
#   deploy/blue-green/bluegreen.sh switch green  send all traffic to green (zero downtime)
#   deploy/blue-green/bluegreen.sh switch blue   roll back to blue
#   deploy/blue-green/bluegreen.sh down          stop everything
set -euo pipefail

DIR=deploy/blue-green
COMPOSE=(docker compose -f "$DIR/docker-compose.yml" --env-file .env)
ACTIVE_FILE="$DIR/nginx/active-upstream"

active() { sed -E 's/server backend-([a-z]+):.*/\1/' "$ACTIVE_FILE"; }

health() { # $1 = colour: ask that container directly, bypassing the proxy
  "${COMPOSE[@]}" exec -T "backend-$1" node -e \
    "fetch('http://localhost:5000/health').then(r=>r.json()).then(j=>console.log(JSON.stringify(j))).catch(e=>{console.log('DOWN', e.message);process.exit(1)})"
}

case "${1:-}" in
  up)
    "${COMPOSE[@]}" up --build -d
    echo "Live: $(active)  →  http://localhost:5002"
    ;;
  status)
    echo "Live colour: $(active)"
    for c in blue green; do echo "  $c: $(health "$c")"; done
    echo "  via proxy: $(curl -s http://localhost:5002/health)"
    ;;
  switch)
    target=${2:?usage: switch blue|green}
    [[ $target == blue || $target == green ]] || { echo "colour must be blue or green" >&2; exit 1; }
    # 1. never switch to a version that is not healthy
    health "$target" | grep -q '"status":"ok"' || { echo "backend-$target is not healthy — not switching" >&2; exit 1; }
    # 2. point the proxy at it and reload nginx gracefully (in-flight requests finish on the old upstream)
    printf 'server backend-%s:5000;\n' "$target" > "$ACTIVE_FILE"
    "${COMPOSE[@]}" exec -T proxy nginx -t -q
    "${COMPOSE[@]}" exec -T proxy nginx -s reload
    echo "Switched live traffic to $target at $(python3 -c "import datetime;print(datetime.datetime.now(datetime.UTC).strftime('%H:%M:%S.%f')[:-3])")"
    ;;
  down)
    "${COMPOSE[@]}" down
    ;;
  *)
    sed -n '2,8p' "$0"; exit 1
    ;;
esac
