.PHONY: setup dev test build lint

setup:
	git config core.hooksPath .githooks
	@echo "Git hooks activated. Commit format: [PREFIX] - message"

dev:
	docker compose up

build:
	docker compose build

test:
	docker compose -f docker-compose.test.yml up --abort-on-container-exit

lint:
	ruff check backend/

# ── Infrastructure ──────────────────────────────────────────────────────────
# Run these from the repo root. They require AWS credentials + terraform CLI.

infra-apply:
	cd infra && terraform apply -var="db_password=$(DB_PASSWORD)"

# Safe destroy: deletes the K8s ingress first so the LBC removes the ALB
# before Terraform touches the VPC/security groups/subnets.
# If the cluster is already gone, the kubectl step is skipped harmlessly.
infra-destroy:
	-aws eks update-kubeconfig --name teyavet-prod --region us-east-1 2>/dev/null && \
	 kubectl delete ingress teyavet-ingress -n teyavet --ignore-not-found && \
	 echo "Waiting 30s for ALB to be deleted by LBC..." && sleep 30
	cd infra && terraform destroy -var="db_password=$(DB_PASSWORD)"
