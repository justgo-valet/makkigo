#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-ap-northeast-2}"
REPO="${GITHUB_REPO:-justgo-valet/makkigo}"
OIDC_SUB_PREFIX="${OIDC_SUB_PREFIX:-repo:justgo-valet@318992933/makkigo@1370744926}"
INSTANCE_ID="${EC2_INSTANCE_ID:?EC2_INSTANCE_ID 가 필요합니다 (예: i-0b8a5131b7af49a02)}"
DEPLOY_ROLE="${DEPLOY_ROLE:-makkigo-github-deploy}"
EC2_ROLE="${EC2_ROLE:-makkigo-prod-ec2}"
IMAGE_BUCKET="${IMAGE_BUCKET:-makkigo-prod-image-apne2}"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
OIDC_HOST="token.actions.githubusercontent.com"
OIDC_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/${OIDC_HOST}"
INSTANCE_ARN="arn:aws:ec2:${REGION}:${ACCOUNT_ID}:instance/${INSTANCE_ID}"
PARAM_ARN="arn:aws:ssm:${REGION}:${ACCOUNT_ID}:parameter/makkigo/prod/*"

echo "계정 ${ACCOUNT_ID}, 리전 ${REGION}, 저장소 ${REPO}, 인스턴스 ${INSTANCE_ID}"

echo "== 1. GitHub OIDC 공급자"
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_ARN" >/dev/null 2>&1; then
  echo "이미 있음"
else
  aws iam create-open-id-connect-provider \
    --url "https://${OIDC_HOST}" \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 1c58a3a8518e8759bf075b76b750d4f2df264fcd >/dev/null
  echo "만듦"
fi

echo "== 2. 배포용 역할 ${DEPLOY_ROLE} (main 브랜치 Actions 만)"
cat >/tmp/deploy-trust.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "${OIDC_ARN}" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "${OIDC_HOST}:aud": "sts.amazonaws.com",
        "${OIDC_HOST}:sub": "${OIDC_SUB_PREFIX}:ref:refs/heads/main"
      }
    }
  }]
}
JSON
cat >/tmp/deploy-policy.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ssm:SendCommand",
      "Resource": [
        "${INSTANCE_ARN}",
        "arn:aws:ssm:${REGION}::document/AWS-RunShellScript"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["ssm:GetCommandInvocation", "ssm:ListCommandInvocations"],
      "Resource": "*"
    }
  ]
}
JSON
if aws iam get-role --role-name "$DEPLOY_ROLE" >/dev/null 2>&1; then
  aws iam update-assume-role-policy --role-name "$DEPLOY_ROLE" --policy-document file:///tmp/deploy-trust.json
  echo "이미 있음 — 신뢰 정책 갱신"
else
  aws iam create-role --role-name "$DEPLOY_ROLE" --assume-role-policy-document file:///tmp/deploy-trust.json >/dev/null
  echo "만듦"
fi
aws iam put-role-policy --role-name "$DEPLOY_ROLE" --policy-name ssm-deploy --policy-document file:///tmp/deploy-policy.json

echo "== 3. EC2 역할 (SSM 연결 + /makkigo/prod/* 읽기 + 업체 · 부스 staging/final 이미지 S3)"
cat >/tmp/ec2-params-policy.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["ssm:GetParametersByPath", "ssm:GetParameters", "ssm:GetParameter"],
    "Resource": ["${PARAM_ARN}", "arn:aws:ssm:${REGION}:${ACCOUNT_ID}:parameter/makkigo/prod"]
  }]
}
JSON
cat >/tmp/ec2-merchant-images-policy.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
    "Resource": [
      "arn:aws:s3:::${IMAGE_BUCKET}/merchants/staging/*",
      "arn:aws:s3:::${IMAGE_BUCKET}/merchants/final/*"
    ]
  }, {
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
    "Resource": [
      "arn:aws:s3:::${IMAGE_BUCKET}/booths/staging/*",
      "arn:aws:s3:::${IMAGE_BUCKET}/booths/final/*"
    ]
  }]
}
JSON
PROFILE_ARN="$(aws ec2 describe-instances --region "$REGION" --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].IamInstanceProfile.Arn' --output text)"
if [[ "$PROFILE_ARN" != "None" ]]; then
  PROFILE_NAME="${PROFILE_ARN##*/}"
  EC2_ROLE="$(aws iam get-instance-profile --instance-profile-name "$PROFILE_NAME" \
    --query 'InstanceProfile.Roles[0].RoleName' --output text)"
  echo "인스턴스에 이미 역할이 있음: ${EC2_ROLE} — 여기에 권한 추가"
else
  cat >/tmp/ec2-trust.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "ec2.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
JSON
  aws iam get-role --role-name "$EC2_ROLE" >/dev/null 2>&1 ||
    aws iam create-role --role-name "$EC2_ROLE" --assume-role-policy-document file:///tmp/ec2-trust.json >/dev/null
  aws iam get-instance-profile --instance-profile-name "$EC2_ROLE" >/dev/null 2>&1 || {
    aws iam create-instance-profile --instance-profile-name "$EC2_ROLE" >/dev/null
    aws iam add-role-to-instance-profile --instance-profile-name "$EC2_ROLE" --role-name "$EC2_ROLE"
    sleep 10
  }
  aws ec2 associate-iam-instance-profile --region "$REGION" --instance-id "$INSTANCE_ID" \
    --iam-instance-profile "Name=${EC2_ROLE}" >/dev/null
  echo "역할 ${EC2_ROLE} 만들어 인스턴스에 연결"
fi
aws iam attach-role-policy --role-name "$EC2_ROLE" --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
aws iam put-role-policy --role-name "$EC2_ROLE" --policy-name makkigo-prod-params --policy-document file:///tmp/ec2-params-policy.json
aws iam put-role-policy --role-name "$EC2_ROLE" --policy-name makkigo-prod-merchant-images --policy-document file:///tmp/ec2-merchant-images-policy.json

echo
echo "완료. GitHub Secrets 에 넣을 값:"
echo "  AWS_DEPLOY_ROLE_ARN = $(aws iam get-role --role-name "$DEPLOY_ROLE" --query Role.Arn --output text)"
echo "  EC2_INSTANCE_ID     = ${INSTANCE_ID}"
