# ─── EKS Control Plane Role ──────────────────────────────────────────────────
# Allows the EKS control plane to manage AWS resources on your behalf
# (create load balancers, describe EC2 instances, manage networking)

resource "aws_iam_role" "eks_cluster" {
  name = "${var.project}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  role       = aws_iam_role.eks_cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

# ─── EKS Worker Node Role ─────────────────────────────────────────────────────
# Attached to the EC2 instances (nodes); lets them join the cluster,
# manage pod networking, and pull images from ECR

resource "aws_iam_role" "eks_nodes" {
  name = "${var.project}-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "eks_cni" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "ecr_read" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# ─── OIDC Provider ────────────────────────────────────────────────────────────
# Enables IAM Roles for Service Accounts (IRSA): individual pods can assume
# narrow IAM roles instead of inheriting all node permissions.
# Required if you add AWS Load Balancer Controller or External Secrets Operator.

data "tls_certificate" "eks" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

# ─── AWS Load Balancer Controller IAM ────────────────────────────────────────
# The LBC runs as a pod inside kube-system and needs AWS permissions to create
# and manage ALBs, target groups, listeners, and security groups on your behalf.
#
# HOW IT WORKS (IRSA — IAM Roles for Service Accounts):
#   1. Terraform creates an IAM role with a trust policy that says:
#      "only the pod running as K8s ServiceAccount
#       system:serviceaccount:kube-system:aws-load-balancer-controller
#       in THIS cluster's OIDC provider may assume this role"
#   2. The Helm chart (installed in deploy-eks.yml) creates that ServiceAccount
#      and annotates it with the role ARN.
#   3. When the LBC pod starts, the AWS SDK inside it exchanges the pod's
#      projected ServiceAccount token for temporary AWS credentials via STS.
#   4. No IAM user keys required — credentials are scoped to this pod only.
#
# The policy JSON is stored in infra/lbc-iam-policy.json (official AWS LBC
# policy, pinned to v2.13 which covers LBC v3.x Helm releases).

locals {
  oidc_issuer = aws_eks_cluster.main.identity[0].oidc[0].issuer
  oidc_host   = replace(local.oidc_issuer, "https://", "")
}

resource "aws_iam_policy" "lbc" {
  name        = "${var.project}-lbc-policy"
  description = "IAM policy for the AWS Load Balancer Controller"
  policy      = file("${path.module}/lbc-iam-policy.json")
}

resource "aws_iam_role" "lbc" {
  name = "${var.project}-lbc-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.eks.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${local.oidc_host}:aud" = "sts.amazonaws.com"
          "${local.oidc_host}:sub" = "system:serviceaccount:kube-system:aws-load-balancer-controller"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lbc" {
  role       = aws_iam_role.lbc.name
  policy_arn = aws_iam_policy.lbc.arn
}

output "lbc_role_arn" {
  description = "IAM role ARN for the AWS Load Balancer Controller (used by deploy-eks.yml)"
  value       = aws_iam_role.lbc.arn
}

# ─── GitHub Actions OIDC ──────────────────────────────────────────────────────
# Allows GitHub Actions workflows to assume an IAM role directly via short-lived
# tokens — no static AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY needed.
#
# HOW IT WORKS:
#   1. GitHub's OIDC provider issues a JWT for each workflow run
#   2. The workflow calls sts:AssumeRoleWithWebIdentity with that JWT
#   3. AWS verifies the JWT came from GitHub and matches the repo condition
#   4. AWS returns temporary credentials scoped to this role
#
# prevent_destroy = true on both resources so terraform destroy cannot remove
# them — losing these would break all workflow authentication.

# Fetches the TLS thumbprint of GitHub's OIDC endpoint so AWS can verify
# that tokens it receives actually came from GitHub and not an impostor.
data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com/.well-known/openid-configuration"
}

# Registers GitHub as a trusted identity provider in this AWS account.
# client_id_list = ["sts.amazonaws.com"] means tokens are intended for AWS STS.
# thumbprint_list pins the TLS cert so AWS rejects tokens from untrusted sources.
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]

  # Never destroy — losing this breaks all workflow authentication
  lifecycle {
    prevent_destroy = true
  }
}

# IAM role that GitHub Actions workflows assume during each run.
# The trust policy conditions lock it to this specific repo only —
# no other GitHub repo can assume this role even if they know the ARN.
resource "aws_iam_role" "github_actions" {
  name = "${var.project}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        # Only allow assumption via the GitHub OIDC provider registered above
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          # Token must be intended for AWS STS (not some other service)
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          # Lock to this repo only — * allows any branch/event within the repo
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*"
        }
      }
    }]
  })

  # Never destroy — losing this breaks all workflow authentication
  lifecycle {
    prevent_destroy = true
  }
}

# Grants the role full AWS access. Broad because terraform-apply needs to
# create/modify any resource. For a multi-team setup, split into narrower
# per-workflow roles (ECR-only for cd.yml, EKS+ECR for deploy-eks.yml).
resource "aws_iam_role_policy_attachment" "github_actions_admin" {
  role       = aws_iam_role.github_actions.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}
