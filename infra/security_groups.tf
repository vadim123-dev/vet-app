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
# Applied to all EC2 worker nodes
# self = true allows node-to-node traffic required for pod networking and kubelet

resource "aws_security_group" "eks_nodes" {
  name        = "${var.project}-eks-nodes-sg"
  description = "EKS worker node communication"
  vpc_id      = aws_vpc.main.id

  # Node-to-node: pod overlay networking, kubelet, daemonsets
  ingress {
    description = "Node-to-node (pod networking, kubelet)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  # Traffic forwarded from the ALB
  ingress {
    description     = "From ALB"
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Nodes need outbound access to: ECR (pull images), EKS API, RDS, OS updates
  # The private subnet route table (NAT gateway) is the actual internet boundary
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
# Only EKS worker nodes can reach MySQL — no public access

resource "aws_security_group" "rds" {
  name        = "${var.project}-rds-sg"
  description = "Allow MySQL only from EKS worker nodes"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "MySQL from EKS nodes"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-rds-sg" }
}
