#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-ap-northeast-2}"
INSTANCE_ID="${EC2_INSTANCE_ID:?EC2_INSTANCE_ID 가 필요합니다}"

echo "== SSM 연결 확인"
for _ in $(seq 1 30); do
  ping="$(aws ssm describe-instance-information --region "$REGION" \
    --filters "Key=InstanceIds,Values=${INSTANCE_ID}" \
    --query 'InstanceInformationList[0].PingStatus' --output text 2>/dev/null || true)"
  [[ "$ping" == Online ]] && break
  echo "아직 연결 안 됨 (${ping:-없음}) — 20초 뒤 다시 확인"
  sleep 20
done
[[ "$ping" == Online ]] || { echo "SSM 에 연결되지 않았습니다. 인스턴스를 재부팅한 뒤 다시 실행해 주세요."; exit 1; }

read -r -d '' SCRIPT <<'REMOTE' || true
set -eux
. /etc/os-release
ARCH="$(uname -m)"
if ! command -v docker >/dev/null 2>&1; then
  if [ "$ID" = amzn ]; then
    dnf install -y docker
  else
    curl -fsSL https://get.docker.com | sh
  fi
fi
systemctl enable --now docker
if ! docker compose version >/dev/null 2>&1; then
  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${ARCH}" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi
if ! command -v aws >/dev/null 2>&1; then
  command -v unzip >/dev/null 2>&1 || { [ "$ID" = amzn ] && dnf install -y unzip || apt-get install -y unzip; }
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-${ARCH}.zip" -o /tmp/awscliv2.zip
  unzip -q -o /tmp/awscliv2.zip -d /tmp && /tmp/aws/install --update
fi
mkdir -p /opt/makkigo/deploy /opt/makkigo/env
chmod 700 /opt/makkigo/env
echo "OS: $PRETTY_NAME ($ARCH)"
docker --version
docker compose version
aws --version
REMOTE

params="$(printf '%s\n' "$SCRIPT" | jq -R . | jq -s '{commands: .}')"
command_id="$(aws ssm send-command --region "$REGION" --instance-ids "$INSTANCE_ID" \
  --document-name AWS-RunShellScript --comment "makkigo bootstrap" \
  --timeout-seconds 900 --parameters "$params" --query Command.CommandId --output text)"
echo "== 설치 명령 보냄: $command_id"
aws ssm wait command-executed --region "$REGION" --command-id "$command_id" --instance-id "$INSTANCE_ID" || true
aws ssm get-command-invocation --region "$REGION" --command-id "$command_id" --instance-id "$INSTANCE_ID" \
  --query '[Status, StandardOutputContent, StandardErrorContent]' --output text
