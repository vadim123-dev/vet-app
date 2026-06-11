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

# ── Step 6: terraform destroy (preserving GitHub Actions OIDC) ─────────────────
# This Terraform version has no -exclude flag, and the GitHub OIDC provider +
# role carry prevent_destroy = true (a blanket destroy errors at plan time and
# tears down nothing). Workaround: remove them from state so destroy ignores
# them (they stay live in AWS), destroy everything else, then re-import them so
# the next terraform-apply sees no diff instead of "EntityAlreadyExists".
OIDC_PROVIDER_ADDR="aws_iam_openid_connect_provider.github"
OIDC_ROLE_ADDR="aws_iam_role.github_actions"
OIDC_ATTACH_ADDR="aws_iam_role_policy_attachment.github_actions_admin"
OIDC_POLICY_ARN="arn:aws:iam::aws:policy/AdministratorAccess"
OIDC_PROVIDER_ID="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"

# Capture the role name from state BEFORE removing it (needed for re-import).
OIDC_ROLE_NAME="$(terraform state show "$OIDC_ROLE_ADDR" 2>/dev/null \
  | awk -F'"' '/^[[:space:]]+name[[:space:]]+=/{print $2; exit}')"
OIDC_ROLE_NAME="${OIDC_ROLE_NAME:-teyavet-github-actions}"

log "Removing GitHub OIDC resources from state (they remain live in AWS)..."
terraform state rm "$OIDC_ATTACH_ADDR" "$OIDC_ROLE_ADDR" "$OIDC_PROVIDER_ADDR" \
  || warn "Some OIDC resources were not in state — continuing"

log "Running terraform destroy..."
terraform destroy -auto-approve

log "Re-importing GitHub OIDC resources so state stays consistent for next apply..."
terraform import "$OIDC_PROVIDER_ADDR" "$OIDC_PROVIDER_ID"
terraform import "$OIDC_ROLE_ADDR" "$OIDC_ROLE_NAME"
terraform import "$OIDC_ATTACH_ADDR" "${OIDC_ROLE_NAME}/${OIDC_POLICY_ARN}"

# ── Backend preservation guard ────────────────────────────────────────────────
# We excluded the GitHub OIDC resources above, so they remain in the Terraform
# state. That state lives in the S3 bucket below — deleting it would orphan the
# OIDC resources (next apply would fail with "already exists"). So by default we
# STOP here, preserving the state backend. Set DESTROY_BACKEND=true for a full
# nuke (only do this if you also intend to remove the OIDC resources).
if [[ "${DESTROY_BACKEND:-false}" != "true" ]]; then
  warn "Preserving Terraform state backend (S3 bucket + DynamoDB lock table)."
  warn "OIDC resources stay tracked in state. Set DESTROY_BACKEND=true to delete the backend too."
  log "Teardown complete — app infrastructure removed; GitHub OIDC + state backend preserved."
  exit 0
fi

# ── Step 7: destroy bootstrap resources (S3 state bucket + DynamoDB lock table)
# These are created by infra/bootstrap/ which has no remote backend, so we
# delete them directly with the AWS CLI instead of via terraform.
log "Destroying bootstrap resources (S3 state bucket + DynamoDB lock table)..."
BUCKET="teyavet-terraform-state-${ACCOUNT_ID}"

if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  log "Emptying S3 bucket $BUCKET (deleting all versions and delete markers)..."

  # Write versions + markers to a temp file so the while loop runs in the current
  # shell (not a pipe subshell). Pipe subshells inherit set -e and silently abort
  # on the first delete-object failure, leaving remaining versions in place.
  TMP_LIST=$(mktemp)
  aws s3api list-object-versions --bucket "$BUCKET" \
      --query 'Versions[*].[Key, VersionId]' --output text 2>/dev/null >> "$TMP_LIST" || true
  aws s3api list-object-versions --bucket "$BUCKET" \
      --query 'DeleteMarkers[*].[Key, VersionId]' --output text 2>/dev/null >> "$TMP_LIST" || true

  while IFS=$'\t' read -r KEY VID; do
    [[ -z "$KEY" || -z "$VID" || "$KEY" == "None" ]] && continue
    aws s3api delete-object --bucket "$BUCKET" --key "$KEY" --version-id "$VID" >/dev/null 2>&1 || true
  done < "$TMP_LIST"
  rm -f "$TMP_LIST"

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
