output "rds_endpoint" {
  description = "RDS MySQL endpoint (host:port) — use as DB_HOST in backend pods"
  value       = aws_db_instance.mysql.endpoint
}

output "rds_host" {
  description = "RDS MySQL hostname only (without port)"
  value       = aws_db_instance.mysql.address
}

output "ecr_backend_url" {
  description = "ECR repository URL for the backend image"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_url" {
  description = "ECR repository URL for the frontend image"
  value       = aws_ecr_repository.frontend.repository_url
}

output "eks_cluster_name" {
  description = "EKS cluster name — use with: aws eks update-kubeconfig --name <value>"
  value       = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  description = "EKS API server endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs (EKS nodes + RDS)"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "Public subnet IDs (ALB)"
  value       = aws_subnet.public[*].id
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions OIDC — save as AWS_ROLE_ARN in GitHub Secrets, then delete AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
  value       = aws_iam_role.github_actions.arn
}
