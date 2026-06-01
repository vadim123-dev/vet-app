# ─── ALB Security Group ───────────────────────────────────────────────────────
# Internet-facing load balancer — accepts HTTP/HTTPS from anywhere

resource "aws_security_group" "alb" {
  name        = "${var.project}-alb-sg"
  description = "Allow HTTP and HTTPS from the internet"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound (to EKS nodes)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-alb-sg" }
}

# ─── EKS Worker Nodes Security Group ─────────────────────────────────────────
# Passed to the EKS cluster's vpc_config so the control plane can communicate
# with nodes. Note: EKS managed node groups also auto-create their own cluster
# security group (eks-cluster-sg-<name>-<id>) and attach it to the actual EC2
# instances — that SG is what governs pod-level traffic (see rules below).

resource "aws_security_group" "eks_nodes" {
  name        = "${var.project}-eks-nodes-sg"
  description = "EKS control-plane and node communication"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Node-to-node (pod networking, kubelet)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  egress {
    description = "All outbound - subnet routing enforces the actual boundary"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-eks-nodes-sg" }
}

# ─── RDS Security Group ───────────────────────────────────────────────────────
# Only EKS worker nodes can reach MySQL — no public access.
# Inline ingress is intentionally absent: the rule referencing the EKS
# cluster's auto-created SG is defined as a separate resource below.

resource "aws_security_group" "rds" {
  name        = "${var.project}-rds-sg"
  description = "Allow MySQL only from EKS worker nodes"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-rds-sg" }
}

# ─── Rules targeting the EKS auto-created cluster security group ──────────────
#
# WHY SEPARATE RESOURCES INSTEAD OF INLINE BLOCKS:
#
# When you create an EKS managed node group, AWS automatically creates a
# "cluster security group" (named eks-cluster-sg-<cluster>-<id>) and attaches
# it to every worker node EC2 instance. This is NOT the custom eks_nodes SG
# above — EKS ignores that SG for the actual node instances.
#
# Because this auto-created SG only exists after aws_eks_cluster is created,
# we cannot reference it inside the aws_security_group resource blocks above
# (Terraform would hit a cycle or an unknown-at-plan-time reference). Using
# separate aws_security_group_rule resources avoids the cycle:
#
#   aws_security_group.rds  ──────────────────────────────────────────┐
#   aws_security_group.alb  ─────────────────────────┐               │
#   aws_eks_cluster.main (depends on eks_nodes SG) ──┤               │
#                                                     ▼               ▼
#                              aws_security_group_rule.eks_cluster_sg_from_alb
#                              aws_security_group_rule.rds_from_eks_cluster_sg
#
# No cycle — the rules depend on the cluster, but the cluster does not depend
# on the rules.

resource "aws_security_group_rule" "rds_from_eks_cluster_sg" {
  type                     = "ingress"
  from_port                = 3306
  to_port                  = 3306
  protocol                 = "tcp"
  description              = "MySQL from EKS nodes (cluster auto-created SG)"
  security_group_id        = aws_security_group.rds.id
  source_security_group_id = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

resource "aws_security_group_rule" "eks_cluster_sg_from_alb" {
  type                     = "ingress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "tcp"
  description              = "All TCP from ALB to EKS pods (cluster auto-created SG)"
  security_group_id        = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
  source_security_group_id = aws_security_group.alb.id
}
