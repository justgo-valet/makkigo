#!/usr/bin/env bash
set -euo pipefail

: "${IMAGE_TAG:?}"
: "${EC2_INSTANCE_ID:?}"
REMOTE_DIR="${REMOTE_DIR:-/opt/makkigo/deploy}"
FILES=(docker-compose.prod.yml Caddyfile load-env.sh deploy.sh)

build_script() {
  echo "set -eu"
  echo "mkdir -p $REMOTE_DIR"
  for f in "${FILES[@]}"; do
    echo "echo $(base64 <"deploy/$f" | tr -d '\n') | base64 -d > $REMOTE_DIR/$f"
  done
  echo "chmod +x $REMOTE_DIR/load-env.sh $REMOTE_DIR/deploy.sh"
  echo "IMAGE_TAG=$IMAGE_TAG $REMOTE_DIR/deploy.sh"
}

if [[ "${1:-}" == "--print" ]]; then
  build_script
  exit 0
fi

params="$(build_script | jq -R . | jq -s '{commands: .}')"

command_id="$(aws ssm send-command \
  --instance-ids "$EC2_INSTANCE_ID" \
  --document-name AWS-RunShellScript \
  --comment "deploy $IMAGE_TAG" \
  --timeout-seconds 1200 \
  --parameters "$params" \
  --query Command.CommandId \
  --output text)"
echo "SSM 명령: $command_id (이미지 태그 $IMAGE_TAG)"

status=Pending
for _ in $(seq 1 120); do
  sleep 10
  status="$(aws ssm get-command-invocation \
    --command-id "$command_id" \
    --instance-id "$EC2_INSTANCE_ID" \
    --query Status --output text 2>/dev/null || echo Pending)"
  [[ "$status" == Pending || "$status" == InProgress || "$status" == Delayed ]] || break
done

aws ssm get-command-invocation --command-id "$command_id" --instance-id "$EC2_INSTANCE_ID" \
  --query '[StandardOutputContent, StandardErrorContent]' --output text || true

echo "결과: $status"
[[ "$status" == Success ]]
