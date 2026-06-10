#!/usr/bin/env bash
# Full teardown script for teyavet AWS infrastructure.
# Deletes Kubernetes resources first so the ALB is gone before Terraform
# touches the VPC — otherwise subnets hang for 15+ minutes and fail.
#
# Usage:
#   DB_PASSWORD=<rds-password> ./scripts/destroy.sh
#   or:
#   export TF_VAR_db_password=<rds-password>
#   ./scripts/destroy.sh

set -euo pipefail

REGION="us-east-1"
CLUSTER="teyavet-prod"
NAMESPACE="teyavet"
INFRA_DIR="$(cd "$(dirname "$0")/../infra" && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[destroy]${NC} $*"; }
warn() { echo -e "${YELLOW}[destroy]${NC} $*"; }
fail() { echo -e "${RED}[destroy] ERROR:${NC} $*" >&2; exit 1; }

# ── Resolve DB password ───────────────────────────────────────────────────────
if [[ -z "${TF_VAR_db_password:-}" ]]; then
  if [[ -n "${DB_PASSWORD:-}" ]]; then
    export TF_VAR_db_password="$DB_PASSWORD"
  else
    read -rsp "Enter RDS db_password: " TF_VAR_db_password
    echo
    export TF_VAR_db_password
  fi
fi

# ── Step 1: configure kubectl ─────────────────────────────────────────────────
log "Configuring kubectl for cluster: $CLUSTER"
if ! aws eks update-kubeconfig --name "$CLUSTER" --region "$REGION" 2>/dev/null; then
  warn "EKS cluster not found or already deleted — skipping Kubernetes cleanup"
  SKIP_K8S=true
fi

# ── Step 2: delete Kubernetes Ingress (triggers ALB deletion by LBC) ─────────
if [[ "${SKIP_K8S:-false}" != "true" ]]; then
  log "Deleting Kubernetes Ingress to trigger ALB deletion..."
  if kubectl get ingress -n "$NAMESPACE" --no-headers 2>/dev/null | grep -q .; then
    kubectl delete ingress --all -n "$NAMESPACE"
  else
    warn "No Ingress found in namespace $NAMESPACE — skipping"
  fi

  # ── Step 3: wait for ALB to be fully deleted ────────────────────────────────
  log "Waiting for ALB to be deleted by the Load Balancer Controller..."
  VPC_ID=$(aws ec2 describe-vpcs --region "$REGION" \
    --filters "Name=tag:Name,Values=teyavet-vpc" \
    --query 'Vpcs[0].VpcId' --output text 2>/dev/null || echo "")

  if [[ -n "$VPC_ID" && "$VPC_ID" != "None" ]]; then
    WAITED=0
    MAX_WAIT=120
    while true; do
      ALB_COUNT=$(aws elbv2 describe-load-balancers --region "$REGION" \
        --query "length(LoadBalancers[?VpcId==\`$VPC_ID\`])" --output text 2>/dev/null || echo "0")
      if [[ "$ALB_COUNT" == "0" ]]; then
        log "ALB deleted."
        break
      fi
      if [[ $WAITED -ge $MAX_WAIT ]]; then
        warn "ALB still present after ${MAX_WAIT}s — deleting it manually..."
        aws elbv2 describe-load-balancers --region "$REGION" \
          --query "LoadBalancers[?VpcId==\`$VPC_ID\`].LoadBalancerArn" \
          --output text | tr '\t' '\n' | while read -r ARN; do
            [[ -z "$ARN" ]] && continue
            log "Force-deleting ALB: $ARN"
            aws elbv2 delete-load-balancer --load-balancer-arn "$ARN" --region "$REGION"
        done
        # Wait for ENIs to clear after manual deletion
        sleep 15
        break
      fi
      echo -n "  ALB still active (${WAITED}s elapsed)..."$'\r'
      sleep 5
      WAITED=$((WAITED + 5))
    done
  else
    warn "VPC not found — skipping ALB wait"
  fi

  # ── Step 4: delete remaining Kubernetes resources ───────────────────────────
  log "Deleting remaining Kubernetes resources in namespace $NAMESPACE..."
  kubectl delete namespace "$NAMESPACE" --ignore-not-found --timeout=60s || \
    warn "Namespace deletion timed out — continuing anyway"
fi

# ── Step 5: terraform init (in case backend config changed) ──────────────────
log "Initializing Terraform..."
cd "$INFRA_DIR"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BACKEND_BUCKET="teyavet-terraform-state-${ACCOUNT_ID}"
terraform init -backend-config="bucket=${BACKEND_BUCKET}" -reconfigure -input=false 2>&1 | grep -v "^$" | grep -v "Reusing\|Using previously"

# ── Step 6: terraform destroy ─────────────────────────────────────────────────
log "Running terraform destroy..."
terraform destroy -auto-approve

# ── Step 7: destroy bootstrap resources (S3 state bucket + DynamoDB lock table)
# These are created by infra/bootstrap/ which has no remote backend, so we
# delete them directly with the AWS CLI instead of via terraform.
log "Destroying bootstrap resources (S3 state bucket + DynamoDB lock table)..."
BUCKET="teyavet-terraform-state-${ACCOUNT_ID}"

if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  log "Emptying S3 bucket $BUCKET (versioning requires deleting all versions + markers)..."

  # Delete all object versions (|| assignment guards against set -e on empty bucket)
  VERSIONS=$(aws s3api list-object-versions --bucket "$BUCKET" \
    --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}, Quiet: true}' \
    --output json 2>/dev/null) || VERSIONS="{}"
  if [[ "$VERSIONS" == *'"VersionId"'* ]]; then
    aws s3api delete-objects --bucket "$BUCKET" --delete "$VERSIONS" >/dev/null
  fi

  # Delete all delete markers left by versioning
  MARKERS=$(aws s3api list-object-versions --bucket "$BUCKET" \
    --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}, Quiet: true}' \
    --output json 2>/dev/null) || MARKERS="{}"
  if [[ "$MARKERS" == *'"VersionId"'* ]]; then
    aws s3api delete-objects --bucket "$BUCKET" --delete "$MARKERS" >/dev/null
  fi

  log "Deleting S3 bucket $BUCKET..."
  aws s3 rb "s3://${BUCKET}" || warn "S3 bucket deletion failed — check for remaining objects"
else
  warn "S3 bucket $BUCKET not found — already deleted"
fi

DYNAMO="teyavet-terraform-locks"
if aws dynamodb describe-table --table-name "$DYNAMO" --region "$REGION" 2>/dev/null | grep -q "ACTIVE\|DELETING"; then
  log "Deleting DynamoDB table $DYNAMO..."
  aws dynamodb delete-table --table-name "$DYNAMO" --region "$REGION" >/dev/null
  aws dynamodb wait table-not-exists --table-name "$DYNAMO" --region "$REGION"
  log "DynamoDB table deleted."
else
  warn "DynamoDB table $DYNAMO not found — already deleted"
fi

log "Full teardown complete — all AWS resources removed."
