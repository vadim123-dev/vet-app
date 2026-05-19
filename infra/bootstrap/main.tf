provider "aws" {
  region = "us-east-1"
}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "tf_state" {
  bucket        = "teyavet-terraform-state-${data.aws_caller_identity.current.account_id}"
  force_destroy = false

  tags = { Name = "teyavet-terraform-state" }
}

resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tf_state" {
  bucket                  = aws_s3_bucket.tf_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "tf_lock" {
  name         = "teyavet-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = { Name = "teyavet-terraform-locks" }
}

output "state_bucket_name" {
  description = "Paste this bucket name into infra/main.tf backend block"
  value       = aws_s3_bucket.tf_state.bucket
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.tf_lock.name
}
