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

Everything runs via GitHub Actions. No local Terraform needed.

### Step 1 — Secrets (one-time setup, never changes)

**GitHub repo → Settings → Secrets and variables → Actions**

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | From `~/.aws/credentials` |
| `AWS_SECRET_ACCESS_KEY` | From `~/.aws/credentials` |
| `ECR_BACKEND_URL` | `257014219799.dkr.ecr.us-east-1.amazonaws.com/teyavet/backend` |
| `ECR_FRONTEND_URL` | `257014219799.dkr.ecr.us-east-1.amazonaws.com/teyavet/frontend` |
| `DB_PASSWORD` | Any strong password — used for RDS and backend pods |
| `JWT_SECRET_KEY` | Any strong random string — `openssl rand -hex 32` |

`RDS_HOST` and `ALB_DNS` are **not needed** — the deploy workflow resolves them automatically.

### Step 2 — Provision infrastructure

**GitHub → Actions → Terraform — Apply Infrastructure → Run workflow**  
Select branch: `master`. Requires approval from the `production` environment gate.

Takes ~15 min. Creates: VPC, EKS cluster, RDS MySQL, ECR repos, IAM roles.  
Safe to re-run — handles existing/orphaned resources automatically.

### Step 3 — Build and push Docker images

Merge any PR to `master` (or push an empty commit). The **CD — Build, Push & Test** workflow runs automatically:

```bash
git commit --allow-empty -m "[CI] - trigger ECR push" && git push origin master
```

Wait for it to go green (~10 min) before the next step.

> **After a fresh destroy+apply**: ECR repos are recreated empty. Re-trigger CD after terraform-apply completes so images exist before deploy.

### Step 4 — Deploy to EKS

**GitHub → Actions → Deploy to EKS → Run workflow**  
Leave tag as `latest`. Requires approval from the `production` environment gate.

The workflow:
1. Installs the AWS Load Balancer Controller via Helm
2. Creates the `teyavet` namespace and K8s secrets
3. Applies the ConfigMap with the live `RDS_HOST` (queried from AWS)
4. Runs the DB migration job (`schema.sql` + `seed_data.sql`)
5. Applies Services and Ingress (triggers ALB provisioning)
6. Waits for the ALB hostname, re-applies ConfigMap with live `CORS_ORIGINS`
7. Deploys backend + frontend (2 replicas each), waits for rollout
8. Prints the app URL

Your app is live at the printed URL. No re-run or secret update needed.

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
