variable "aws_region" {
  description = "AWS region to deploy into"
  default     = "us-east-1"
}

variable "project" {
  description = "Project name used as a prefix for all resource names"
  default     = "teyavet"
}

variable "environment" {
  description = "Deployment environment (prod, staging, dev)"
  default     = "prod"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (one per AZ)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets (one per AZ)"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

variable "availability_zones" {
  description = "AZs to deploy subnets into — must match the region"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "eks_version" {
  description = "Kubernetes version for the EKS cluster"
  default     = "1.31"
}

variable "eks_node_instance_type" {
  description = "EC2 instance type for EKS worker nodes"
  default     = "t3.medium"
}

variable "eks_node_desired" {
  description = "Desired number of worker nodes"
  default     = 1
}

variable "eks_node_min" {
  description = "Minimum number of worker nodes"
  default     = 1
}

variable "eks_node_max" {
  description = "Maximum number of worker nodes (for autoscaling)"
  default     = 2
}

variable "rds_instance_class" {
  description = "RDS instance class"
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "MySQL database name (matches DB_NAME in backend)"
  default     = "vet"
}

variable "db_username" {
  description = "RDS master username"
  default     = "vetadmin"
}

variable "db_password" {
  description = "RDS master password — pass via TF_VAR_db_password env var or terraform.tfvars (never commit)"
  type        = string
  sensitive   = true
}
