#!/bin/sh
set -eu

cd "$(dirname "$0")"

: "${IMAGE_TAG:?IMAGE_TAG 가 필요합니다 (예: sha-3d2b1a9, 1.0.0)}"
ENV_DIR="${ENV_DIR:-/opt/makkigo/env}"
export IMAGE_TAG ENV_DIR

CLEANUP_RUNNER=apps/valetagents/scripts/merchant-upload-cleanup-runner.mjs
NOTIFICATION_RUNNER=apps/valetagents/scripts/agent-notification-sync-runner.mjs
APP_IMAGE_PREFIX=ghcr.io/justgo-valet/makkigo-

compose() {
  docker compose -f docker-compose.prod.yml "$@"
}

# 배포마다 sha 태그 이미지(고객 · 요원 · 마이그레이션. 마이그레이션은 2GB 넘음)를 새로 받는다.
# `docker image prune` 은 태그 없는 이미지만 지우므로 이번 태그가 아닌 우리 이미지는 직접 지운다.
# 실행 중인 컨테이너가 쓰는 이미지는 docker 가 지우지 않으므로 받기 전에 돌려도 서비스는 그대로다.
# 디스크(20GB)가 차면 이미지 받기와 SSM 에이전트가 함께 실패한다.
remove_old_app_images() {
  docker images --format '{{.Repository}}:{{.Tag}}' \
    | grep "^$APP_IMAGE_PREFIX" \
    | grep -v ":$IMAGE_TAG\$" \
    | xargs -r docker rmi >/dev/null 2>&1 || true
  docker image prune -f >/dev/null
}

./load-env.sh

set -a
. "$ENV_DIR/deploy.env"
set +a
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin

remove_old_app_images
# 진행 표시 줄이 SSM 출력(24,000자)을 채워 실제 오류를 가리므로 끈다.
compose --profile migrate pull --quiet

if compose run --rm --no-deps merchant-upload-cleanup test -f "$CLEANUP_RUNNER"; then
  has_cleanup_runner=true
else
  compose run --rm --no-deps merchant-upload-cleanup test ! -e "$CLEANUP_RUNNER" || {
    echo "could not determine whether image $IMAGE_TAG has the merchant-upload-cleanup runner" >&2
    exit 1
  }
  has_cleanup_runner=false
fi

if compose run --rm --no-deps agent-notification-sync test -f "$NOTIFICATION_RUNNER"; then
  has_notification_runner=true
else
  compose run --rm --no-deps agent-notification-sync test ! -e "$NOTIFICATION_RUNNER" || {
    echo "could not determine whether image $IMAGE_TAG has the agent-notification-sync runner" >&2
    exit 1
  }
  has_notification_runner=false
fi

compose up -d postgres
compose run --rm migrate

scale_args=""
if [ "$has_cleanup_runner" != true ]; then
  echo "image $IMAGE_TAG has no merchant-upload-cleanup runner; starting without the cleanup container"
  scale_args="$scale_args --scale merchant-upload-cleanup=0"
fi
if [ "$has_notification_runner" != true ]; then
  echo "image $IMAGE_TAG has no agent-notification-sync runner; starting without the notification container"
  scale_args="$scale_args --scale agent-notification-sync=0"
fi
compose up -d --remove-orphans $scale_args

compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile

if [ "$has_cleanup_runner" = true ]; then
  attempt=0
  until compose exec -T merchant-upload-cleanup node "$CLEANUP_RUNNER" --healthcheck; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 120 ]; then
      echo "merchant-upload-cleanup heartbeat did not become healthy within 240 seconds" >&2
      exit 1
    fi
    sleep 2
  done

  if ! compose run --rm --no-deps merchant-upload-cleanup node "$CLEANUP_RUNNER" --once --dry-run; then
    if grep -q '^MERCHANT_UPLOAD_CLEANUP_ENABLED=.*true' "$ENV_DIR/valetagents.env"; then
      echo "merchant-upload-cleanup dry-run failed while cleanup is enabled" >&2
      exit 1
    fi
    echo "merchant-upload-cleanup dry-run failed; continuing because cleanup is disabled"
  fi
fi

if [ "$has_notification_runner" = true ]; then
  attempt=0
  until compose exec -T agent-notification-sync node "$NOTIFICATION_RUNNER" --healthcheck; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 60 ]; then
      echo "agent-notification-sync heartbeat did not become healthy within 120 seconds" >&2
      exit 1
    fi
    sleep 2
  done
fi

remove_old_app_images
df -h /

compose ps
