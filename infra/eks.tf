resource "aws_eks_cluster" "main" {
  name     = local.cluster_name
  role_arn = aws_iam_role.eks_cluster.arn
  version  = var.eks_version

  vpc_config {
    # Include both public and private subnets so EKS can place resources in either
    subnet_ids = concat(
      aws_subnet.public[*].id,
      aws_subnet.private[*].id
    )
    security_group_ids = [aws_security_group.eks_nodes.id]

    # Public endpoint lets you run kubectl from your laptop
    # Private endpoint lets nodes communicate with control plane inside the VPC
    endpoint_public_access  = true
    endpoint_private_access = true
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
  ]

  tags = { Name = local.cluster_name }
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.project}-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn

  # Worker nodes live in private subnets only — ALB in public subnets routes to them
  subnet_ids = aws_subnet.private[*].id

  instance_types = [var.eks_node_instance_type]
  ami_type       = "AL2_x86_64"
  disk_size      = 20

  scaling_config {
    desired_size = var.eks_node_desired
    min_size     = var.eks_node_min
    max_size     = var.eks_node_max
  }

  update_config {
    max_unavailable = 1
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node,
    aws_iam_role_policy_attachment.eks_cni,
    aws_iam_role_policy_attachment.ecr_read,
  ]

  tags = { Name = "${var.project}-node-group" }
}
