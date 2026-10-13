#!/bin/sh
set -eu

cd "$(dirname "$0")"

: "${IMAGE_TAG:?IMAGE_TAG 가 필요합니다 (예: sha-3d2b1a9, 1.0.0)}"
ENV_DIR="${ENV_DIR:-/opt/makkigo/env}"
export IMAGE_TAG ENV_DIR

compose() {
  docker compose -f docker-compose.prod.yml "$@"
}

./load-env.sh

set -a
. "$ENV_DIR/deploy.env"
set +a
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin

compose --profile migrate pull
compose up -d postgres
compose run --rm migrate
compose up -d --remove-orphans

compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile

attempt=0
until compose exec -T merchant-upload-cleanup \
  node apps/valetagents/scripts/merchant-upload-cleanup-runner.mjs --healthcheck; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 120 ]; then
    echo "merchant-upload-cleanup heartbeat did not become healthy within 240 seconds" >&2
    exit 1
  fi
  sleep 2
done

compose run --rm --no-deps merchant-upload-cleanup \
  node apps/valetagents/scripts/merchant-upload-cleanup-runner.mjs --once --dry-run
docker image prune -f

compose ps
