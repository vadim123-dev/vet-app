#!/usr/bin/env bash
# Terraform Infrastructure Verification Script
# Checks that all resources created by terraform-apply.yml are deployed correctly
# Run this after the terraform-apply.yml workflow completes

set -euo pipefail

REGION="us-east-1"
PROJECT="teyavet"
ENVIRONMENT="prod"
CLUSTER_NAME="${PROJECT}-${ENVIRONMENT}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

pass()  { echo -e "${GREEN}✓${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
info()  { echo -e "${BLUE}ℹ${NC} $*"; }
header() { echo -e "\n${BLUE}═══ $* ═══${NC}\n"; }

# Track results
PASSED=0
FAILED=0

check_resource() {
  local name=$1
  local cmd=$2
  local expected=${3:-}

  if eval "$cmd" &>/dev/null; then
    pass "$name"
    PASSED=$((PASSED+1))
  else
    fail "$name"
    FAILED=$((FAILED+1))
  fi
}

header "AWS Account & Credentials"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "UNKNOWN")
AWS_USER=$(aws sts get-caller-identity --query Arn --output text 2>/dev/null || echo "UNKNOWN")
info "Account ID: $ACCOUNT_ID"
info "Authenticated as: $AWS_USER"

header "1. Terraform State Backend (Bootstrap)"
check_resource "S3 bucket for state" \
  "aws s3 ls s3://${PROJECT}-terraform-state-${ACCOUNT_ID}/"

check_resource "DynamoDB table for locks" \
  "aws dynamodb describe-table --table-name teyavet-terraform-locks --region $REGION"

header "2. VPC & Networking"
VPC_ID=$(aws ec2 describe-vpcs --region $REGION \
  --filters "Name=tag:Name,Values=${PROJECT}-vpc" \
  --query 'Vpcs[0].VpcId' --output text 2>/dev/null || echo "")

if [[ -n "$VPC_ID" && "$VPC_ID" != "None" ]]; then
  pass "VPC created: $VPC_ID"
  PASSED=$((PASSED+1))

  # Public subnets
  PUB_COUNT=$(aws ec2 describe-subnets --region $REGION \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:kubernetes.io/role/elb,Values=1" \
    --query 'length(Subnets)' --output text 2>/dev/null || echo "0")
  if [[ "$PUB_COUNT" == "2" ]]; then
    pass "Public subnets: $PUB_COUNT (expected 2)"
    PASSED=$((PASSED+1))
  else
    fail "Public subnets: found $PUB_COUNT, expected 2"
    FAILED=$((FAILED+1))
  fi

  # Private subnets
  PRIV_COUNT=$(aws ec2 describe-subnets --region $REGION \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:kubernetes.io/role/internal-elb,Values=1" \
    --query 'length(Subnets)' --output text 2>/dev/null || echo "0")
  if [[ "$PRIV_COUNT" == "2" ]]; then
    pass "Private subnets: $PRIV_COUNT (expected 2)"
    PASSED=$((PASSED+1))
  else
    fail "Private subnets: found $PRIV_COUNT, expected 2"
    FAILED=$((FAILED+1))
  fi

  # IGW
  check_resource "Internet Gateway" \
    "aws ec2 describe-internet-gateways --region $REGION \
      --filters \"Name=attachment.vpc-id,Values=$VPC_ID\" \
      --query 'InternetGateways[0].InternetGatewayId' | grep -q igw"

  # NAT Gateway
  check_resource "NAT Gateway" \
    "aws ec2 describe-nat-gateways --region $REGION \
      --filter \"Name=vpc-id,Values=$VPC_ID\" \
      --query 'NatGateways[0].NatGatewayId' | grep -q nat"

else
  fail "VPC not found (tag Name=${PROJECT}-vpc)"
  FAILED=$((FAILED+1))
fi

header "3. EKS Cluster"
check_resource "EKS cluster: $CLUSTER_NAME" \
  "aws eks describe-cluster --name $CLUSTER_NAME --region $REGION"

# Verify cluster status
CLUSTER_STATUS=$(aws eks describe-cluster --name $CLUSTER_NAME --region $REGION \
  --query 'cluster.status' --output text 2>/dev/null || echo "UNKNOWN")
info "Cluster status: $CLUSTER_STATUS"
if [[ "$CLUSTER_STATUS" == "ACTIVE" ]]; then
  pass "EKS cluster is ACTIVE"
  PASSED=$((PASSED+1))
else
  warn "EKS cluster status is $CLUSTER_STATUS (expected ACTIVE)"
fi

# Node group
check_resource "EKS Node Group" \
  "aws eks describe-nodegroup --cluster-name $CLUSTER_NAME --nodegroup-name ${PROJECT}-nodes --region $REGION"

NODE_STATUS=$(aws eks describe-nodegroup --cluster-name $CLUSTER_NAME \
  --nodegroup-name ${PROJECT}-nodes --region $REGION \
  --query 'nodegroup.status' --output text 2>/dev/null || echo "UNKNOWN")
info "Node group status: $NODE_STATUS"

header "4. RDS Database"
check_resource "RDS MySQL instance" \
  "aws rds describe-db-instances --db-instance-identifier ${PROJECT}-mysql --region $REGION"

RDS_STATUS=$(aws rds describe-db-instances --db-instance-identifier ${PROJECT}-mysql --region $REGION \
  --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo "UNKNOWN")
info "RDS status: $RDS_STATUS"
if [[ "$RDS_STATUS" == "available" ]]; then
  pass "RDS is available"
  PASSED=$((PASSED+1))
else
  warn "RDS status is $RDS_STATUS (expected 'available')"
fi

RDS_HOST=$(aws rds describe-db-instances --db-instance-identifier ${PROJECT}-mysql --region $REGION \
  --query 'DBInstances[0].Endpoint.Address' --output text 2>/dev/null || echo "UNKNOWN")
info "RDS endpoint: $RDS_HOST"

header "5. ECR Repositories"
check_resource "ECR backend repository" \
  "aws ecr describe-repositories --repository-names ${PROJECT}/backend --region $REGION"

check_resource "ECR frontend repository" \
  "aws ecr describe-repositories --repository-names ${PROJECT}/frontend --region $REGION"

header "6. Security Groups"
check_resource "EKS security group" \
  "aws ec2 describe-security-groups --region $REGION \
    --filters \"Name=vpc-id,Values=$VPC_ID\" \"Name=tag:Name,Values=${PROJECT}-eks-nodes-sg\" \
    --query 'SecurityGroups[0].GroupId' | grep -q sg"

check_resource "RDS security group" \
  "aws ec2 describe-security-groups --region $REGION \
    --filters \"Name=vpc-id,Values=$VPC_ID\" \"Name=tag:Name,Values=${PROJECT}-rds-sg\" \
    --query 'SecurityGroups[0].GroupId' | grep -q sg"

header "7. IAM Roles"
check_resource "EKS cluster IAM role" \
  "aws iam get-role --role-name ${PROJECT}-eks-cluster-role"

check_resource "EKS node IAM role" \
  "aws iam get-role --role-name ${PROJECT}-eks-node-role"

header "📊 Summary"
TOTAL=$((PASSED + FAILED))
echo "Passed: $PASSED/$TOTAL"
echo "Failed: $FAILED/$TOTAL"

if [[ $FAILED -eq 0 ]]; then
  pass "All infrastructure verified!"
  exit 0
else
  fail "$FAILED checks failed"
  exit 1
fi
