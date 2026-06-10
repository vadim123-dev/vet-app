# TeyaVet — Deployment Runbook

Complete guide for standing up and tearing down the production environment from scratch.

---

## Prerequisites (one-time local setup)

| Tool | Install |
|------|---------|
| [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) | `brew install awscli` |
| [Terraform >= 1.6](https://developer.hashicorp.com/terraform/install) | `brew tap hashicorp/tap && brew install hashicorp/tap/terraform` |
| [kubectl](https://kubernetes.io/docs/tasks/tools/) | `brew install kubectl` |
| [Helm >= 3](https://helm.sh/docs/intro/install/) | `brew install helm` |

Configure AWS credentials:
```bash
aws configure
# Enter: Access Key ID, Secret Access Key, region = us-east-1, output = json
```

---

## GitHub Secrets — what they are and where to set them

**Location:** GitHub repo → Settings → Secrets and variables → Actions → New repository secret

| Secret | What it is | Where to get it | Changes after destroy? |
|--------|-----------|-----------------|------------------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key | `~/.aws/credentials` or AWS Console → IAM → Users → Security credentials | No |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key | Same as above | No |
| `ECR_BACKEND_URL` | ECR repo URL for the Flask backend image | `terraform output ecr_backend_url` after Phase 2 | No — built from account ID which never changes |
| `ECR_FRONTEND_URL` | ECR repo URL for the React frontend image | `terraform output ecr_frontend_url` after Phase 2 | No — same reason |
| `DB_PASSWORD` | RDS master password (used by backend pods and migration job) | The value you passed as `db_password` to `terraform apply` | No |
| `JWT_SECRET_KEY` | Secret used to sign JWTs — any strong random string | `openssl rand -hex 32` | No |
| `ALB_DNS` | ALB hostname — used as CORS fallback only | Printed by "Deploy to EKS" workflow; **optional** — the deploy workflow resolves the live hostname automatically | Handled automatically |

> **`RDS_HOST` is no longer a secret** — the deploy workflow queries the RDS endpoint dynamically via AWS CLI so it's always correct regardless of recreates.

---

## Full deployment order

### Phase 1 — Bootstrap Terraform state backend

> Skip if the S3 bucket `teyavet-terraform-state-<account-id>` already exists.

```bash
cd infra/bootstrap
terraform init
terraform apply
```

Creates:
- S3 bucket for Terraform remote state (versioned + AES-256 encrypted)
- DynamoDB table for state locking

### Phase 2 — Provision AWS infrastructure

```bash
cd infra
terraform init          # connects to the S3 backend created in Phase 1
terraform plan  -var="db_password=YOUR_PASSWORD"
terraform apply -var="db_password=YOUR_PASSWORD"
```

Takes ~15 minutes (EKS cluster is slow). Creates: VPC, subnets, NAT gateway, EKS cluster + node group, RDS MySQL, ECR repos, IAM roles, security groups.

After apply, save the outputs — you need them for GitHub Secrets:

```bash
terraform output
```

### Phase 3 — Set GitHub Secrets

Set the following secrets once (they never change between destroy/recreate cycles):

```bash
# Get ECR URLs (account ID never changes, so these are permanent)
terraform -chdir=infra output ecr_backend_url
terraform -chdir=infra output ecr_frontend_url
```

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | From `~/.aws/credentials` |
| `AWS_SECRET_ACCESS_KEY` | From `~/.aws/credentials` |
| `ECR_BACKEND_URL` | From `terraform output ecr_backend_url` |
| `ECR_FRONTEND_URL` | From `terraform output ecr_frontend_url` |
| `DB_PASSWORD` | The password you use for `terraform apply` |
| `JWT_SECRET_KEY` | `openssl rand -hex 32` |

`RDS_HOST` and `ALB_DNS` are resolved automatically by the deploy workflow — no manual secret needed.

### Phase 4 — Build and push Docker images to ECR

Push any commit to `master`. The **CD — Build, Push & Test** workflow runs automatically:
1. Builds backend + frontend Docker images
2. Smoke-tests them locally in CI
3. Pushes `:<sha>` and `:latest` tags to ECR
4. Pulls from ECR and runs full E2E tests

```bash
git commit --allow-empty -m "[CI] - trigger initial ECR push"
git push origin master
```

Wait for the workflow to go green (~10 min) before continuing.

### Phase 5 — Deploy to EKS

Go to **GitHub → Actions → Deploy to EKS → Run workflow** (leave tag as `latest`).

The workflow:
1. Installs the **AWS Load Balancer Controller** via Helm (idempotent — safe to re-run)
2. Creates the `teyavet` namespace
3. Creates the `backend-secrets` K8s Secret (DB_PASSWORD + JWT_SECRET_KEY)
4. Applies the ConfigMap — resolves `RDS_HOST` live from AWS, uses `ALB_DNS` secret as placeholder
5. Runs the DB migration Job (applies `schema.sql` + `seed_data.sql` to RDS)
6. Applies Services and the Ingress (triggers ALB provisioning)
7. Waits for the ALB hostname to be assigned, then **re-applies the ConfigMap** with the live hostname so `CORS_ORIGINS` is correct from the first deploy
8. Deploys backend (2 replicas) + frontend (2 replicas)
9. Waits for rollout
10. **Prints the app URL**

Your app is now live at the printed URL. No re-run needed.

---

## Subsequent deployments (after the first)

On every `git push` to `master` the CD pipeline rebuilds and pushes new images.  
To deploy those new images to EKS: **Actions → Deploy to EKS → Run workflow**.

**Secrets that ever need updating:**

| Scenario | Secrets to update |
|----------|------------------|
| After `terraform destroy` + `terraform apply` | Nothing — `RDS_HOST` and `ALB_DNS` are resolved automatically |
| AWS IAM key rotation | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| DB password change | `DB_PASSWORD` |
| JWT secret rotation | `JWT_SECRET_KEY` |

---

## Tearing down

Use the destroy script — it handles Kubernetes cleanup, Terraform destroy, and bootstrap resource deletion in the correct order:

```bash
DB_PASSWORD=YOUR_PASSWORD ./scripts/destroy.sh
```

This removes everything: VPC, EKS, RDS, ECR repos, IAM roles, the S3 state bucket, and the DynamoDB lock table.

---

## Why not run Terraform in the GitHub Actions workflow?

You can — and for a fully automated setup it's the right call. Here's the trade-off:

**Running Terraform in CI (recommended for teams):**
- Add `TF_VAR_DB_PASSWORD` as a GitHub Secret (same value as `DB_PASSWORD`)
- Create two manual-trigger workflows:

  **`terraform-apply.yml`** (deploy infra):
  ```yaml
  on:
    workflow_dispatch:
  jobs:
    apply:
      steps:
        - uses: actions/checkout@v4
        - uses: aws-actions/configure-aws-credentials@v4
          with: { aws-access-key-id: ..., aws-secret-access-key: ..., aws-region: us-east-1 }
        - run: terraform -chdir=infra init
        - run: terraform -chdir=infra apply -auto-approve -var="db_password=${{ secrets.DB_PASSWORD }}"
        - run: terraform -chdir=infra output -json >> $GITHUB_STEP_SUMMARY
  ```

  **`terraform-destroy.yml`** (tear down infra, with `environment: production` gate for approval):
  ```yaml
  on:
    workflow_dispatch:
  jobs:
    destroy:
      environment: production   # requires manual approval in GitHub Settings
      steps:
        - run: terraform -chdir=infra destroy -auto-approve -var="db_password=${{ secrets.DB_PASSWORD }}"
  ```

**Why this repo currently runs Terraform locally:**
- Simpler to start — no extra secrets or workflow files needed
- You control exactly when infra changes are applied
- `terraform destroy` in CI with `auto-approve` is risky without an approval gate

The manual approach is fine for a single-developer project. When you're ready to fully automate, add the two workflows above and you'll never need to run Terraform locally again.
