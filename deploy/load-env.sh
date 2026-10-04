#!/bin/sh
set -eu

PREFIX="${SSM_PREFIX:-/makkigo/prod}"
ENV_DIR="${ENV_DIR:-/opt/makkigo/env}"
REGION="${AWS_REGION:-ap-northeast-2}"
TAB="$(printf '\t')"

umask 077
mkdir -p "$ENV_DIR"

for target in users valetagents postgres deploy; do
  tmp="$(mktemp "$ENV_DIR/.$target.XXXXXX")"
  aws ssm get-parameters-by-path \
    --region "$REGION" \
    --path "$PREFIX/$target" \
    --recursive \
    --with-decryption \
    --query 'Parameters[*].[Name,Value]' \
    --output text |
    while IFS="$TAB" read -r name value; do
      printf '%s=%s\n' "${name##*/}" "$value"
    done >"$tmp"
  mv "$tmp" "$ENV_DIR/$target.env"
  echo "$target: $(wc -l <"$ENV_DIR/$target.env" | tr -d ' ')개"
done
