# RDS requires a subnet group with at least 2 AZs even for single-AZ instances
resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${var.project}-db-subnet-group" }
}

# Match the charset/collation the app expects (set in backend db_config.py: charset=utf8mb4)
resource "aws_db_parameter_group" "mysql8" {
  name   = "${var.project}-mysql8"
  family = "mysql8.0"

  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }

  parameter {
    name  = "collation_server"
    value = "utf8mb4_unicode_ci"
  }

  tags = { Name = "${var.project}-mysql8-params" }
}

resource "aws_db_instance" "mysql" {
  identifier        = "${var.project}-mysql"
  engine            = "mysql"
  engine_version    = "8.0"
  instance_class    = var.rds_instance_class
  allocated_storage = 20
  storage_type      = "gp2"

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.mysql8.name

  publicly_accessible = false

  # Set skip_final_snapshot = false and deletion_protection = true for real production
  skip_final_snapshot     = true
  deletion_protection     = false
  backup_retention_period = 7

  tags = { Name = "${var.project}-mysql" }
}
