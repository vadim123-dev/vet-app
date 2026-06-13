# TeyaVet — Veterinary Clinic Management System

A full-stack veterinary clinic management application for clinic staff to manage pet owners, patient records, measurements, and appointments.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Quick Start (Docker)](#quick-start-docker)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Database Design](#database-design)
- [Frontend Architecture](#frontend-architecture)
- [CI/CD Pipeline](#cicd-pipeline)
- [Production Infrastructure (AWS)](#production-infrastructure-aws)
- [Commit Convention](#commit-convention)
- [Common Gotchas](#common-gotchas)

---

## Features

- **Dashboard** — Clinic overview: today's appointments, boarders, staff on duty, reminders, and inventory status
- **Pet Owners** — Browse, add, and manage pet owner profiles
- **Patients** — Browse all pets with measurements; drill into full patient profiles and visit history
- **Appointments** — Day-view scheduler grid (8am–11pm) with per-vet and per-room columns, conflict detection, booking, rescheduling, and cancellation
- **Visit Records** — SOAP-style visit notes (chief complaint, exam notes, assessment, plan) and prescriptions
- **User Management** — Admin panel to manage clinic user accounts and roles

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.13, Flask 2.x, Flask-JWT-Extended, SQLAlchemy 2.x (connection pool only), PyMySQL |
| Frontend | React 19, Vite, React Router v7, plain CSS (no UI framework) |
| Database | MySQL 8 (InnoDB, utf8mb4) |
| Local Infra | Docker Compose (3 services: mysql, backend, frontend) |
| Production Infra | AWS EKS + RDS MySQL, ECR, VPC/ALB, Terraform |
| CI/CD | GitHub Actions, AWS OIDC (keyless auth), Trivy security scanning |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         GitHub Actions CI/CD                     │
│  PR Checks → CD (Build + ECR Push) → Deploy to EKS (manual)    │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────── AWS (us-east-1) ─────────────────────────────┐
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    EKS Cluster (teyavet-prod)             │   │
│  │                                                           │   │
│  │  ALB Ingress                                              │   │
│  │   ├── /users, /pets, /appointments, … → Backend (×2)     │   │
│  │   └── /                              → Frontend (×2)     │   │
│  │                                                           │   │
│  │  Backend Pod            Frontend Pod                      │   │
│  │  (Flask API)            (Nginx + React SPA)               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                    │                             │
│  ┌─────────────────┐               │                             │
│  │  RDS MySQL 8    │◄──────────────┘                             │
│  │  (db.t3.micro)  │                                             │
│  └─────────────────┘                                             │
│                                                                   │
│  ECR: teyavet/backend, teyavet/frontend                          │
└───────────────────────────────────────────────────────────────────┘
```

**Data flow:** Browser → ALB → Frontend Nginx (serves React SPA) → React calls ALB `/api/*` → Flask Backend → RDS MySQL

---

## Project Structure

```
vet-app/
├── .github/workflows/
│   ├── pr-checks.yml          # Lint, audit, build, tests on every PR
│   ├── cd.yml                 # Build, test, security scan, push to ECR (on master push)
│   ├── deploy-eks.yml         # Deploy to EKS — manual trigger
│   └── terraform-apply.yml    # Provision AWS infra — manual trigger
├── .githooks/
│   └── commit-msg             # Enforces [PREFIX] - message commit format
├── infra/                     # Terraform (VPC, EKS, RDS, ECR, IAM)
│   ├── bootstrap/             # S3 + DynamoDB for TF remote state
│   ├── main.tf
│   ├── variables.tf
│   ├── vpc.tf
│   ├── eks.tf
│   ├── rds.tf
│   ├── ecr.tf
│   ├── iam.tf
│   └── security_groups.tf
├── k8s/                       # Kubernetes manifests (teyavet namespace)
│   ├── namespace.yaml
│   ├── ingress.yaml           # ALB ingress with path-based routing
│   ├── backend/               # Deployment, Service, ConfigMap, Secret, migration Job
│   └── frontend/              # Deployment, Service
├── backend/                   # Flask API
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── requirements-dev.txt   # ruff, pytest, pip-audit
│   ├── app.py                 # Flask factory, CORS, db_engine
│   ├── config.py              # JWT config (15 min access / 14 day refresh)
│   ├── db/
│   │   ├── db_config.py       # DBConfig dataclass, SQLAlchemy engine, UUID helpers
│   │   └── repo.py            # ALL raw SQL queries — no ORM, returns plain dicts
│   ├── models/                # User, Pet, Animal, Cat, Dog (plain Python classes)
│   ├── repositories/          # user_repository.py
│   ├── routes/                # Blueprints: user, pet, appointment, visit, shift, dashboard
│   ├── services/              # auth_service, user_data_service, animal_data_service
│   ├── utils/                 # auth_utils (password generation/hashing)
│   └── tests/
│       ├── unit/              # Unit tests
│       └── e2e/               # End-to-end tests (pytest)
├── frontend/                  # React 19 + Vite SPA
│   ├── Dockerfile             # Development (Node 20 Alpine + Vite dev server)
│   ├── Dockerfile.prod        # Production (multi-stage: Node build → Nginx serve)
│   ├── nginx.conf             # Nginx config for production image
│   ├── src/
│   │   ├── main.jsx           # React entry point + Router
│   │   ├── App.jsx            # Routes: /login (public), / (protected)
│   │   ├── api.js             # apiFetch() — auto-injects Bearer token
│   │   ├── auth/              # AuthContext, ProtectedRoute
│   │   ├── components/        # TopNav (5 tabs + settings gear), TeyaLogo
│   │   └── pages/             # LoginPage, Dashboard, DashboardPage, PetOwnersPage,
│   │                          # PatientsPage, PetProfileView, AppointmentsPage,
│   │                          # NewAppointmentModal, RescheduleModal, VisitModal,
│   │                          # CheckInModal, AddOwnerModal, AddPatientModal,
│   │                          # UserManagementPage
├── db/
│   ├── docker-compose.yml     # DB-only compose (for local dev without full stack)
│   └── init/
│       ├── schema.sql         # Source of truth for DB schema
│       └── seed_data.sql      # Initial data (users, roles, breeds, rooms)
├── docker-compose.yml         # Full-stack local compose
├── Makefile                   # Dev shortcuts: setup, dev, build, test, lint, infra-*
└── presentation/              # Architecture diagrams (HTML + PowerPoint)
```

---

## Quick Start (Docker)

> **Prerequisites:** Docker Desktop installed and running.

```bash
# Clone the repo
git clone <repo-url>
cd vet-app

# Activate git hooks (enforces commit message format)
make setup

# First run — builds images and starts all services
docker compose up --build

# Subsequent runs
docker compose up
```

**Services after startup:**

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost:5173 | React dev server (Vite HMR) |
| Backend API | http://localhost:5000 | Flask with auto-reload |
| MySQL | localhost:3306 | root / pandaTeya / db: vet |

**Common Docker commands:**

```bash
docker compose down              # Stop all services
docker compose down -v           # Stop + wipe database volume (full reset)
docker compose restart backend   # Restart only the backend
docker compose logs -f backend   # Tail backend logs
docker compose logs -f frontend  # Tail frontend logs
```

---

## Local Development Setup

### Option 1: Full stack via Docker (recommended)

See [Quick Start](#quick-start-docker) above.

### Option 2: Local processes + DB in Docker

Useful when you want faster iteration on backend or frontend without rebuilding Docker images.

**Step 1 — Start MySQL only:**
```bash
cd db
docker compose up
```

**Step 2 — Start backend:**
```bash
# From the project root (imports are backend.xxx)
cd backend
pip install -r requirements.txt -r requirements-dev.txt

export FLASK_APP=backend.app
export FLASK_DEBUG=1
export DB_HOST=127.0.0.1
export DB_PORT=3306
export DB_USER=root
export DB_PASSWORD=pandaTeya
export DB_NAME=vet
export CORS_ORIGINS=http://localhost:5173
export JWT_SECRET_KEY=dev-secret-change-me

flask run
# → http://localhost:5000
```

**Step 3 — Start frontend:**
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Running tests

```bash
# Backend unit tests
cd backend && pytest tests/unit/

# Backend e2e tests (requires running DB)
pytest tests/e2e/

# All tests via Docker
make test

# Lint backend (ruff)
make lint

# Lint frontend (ESLint)
cd frontend && npm run lint
```

---

## Environment Variables

### Backend (`backend/.env` or shell exports)

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `127.0.0.1` | MySQL host (`mysql` in Docker, RDS endpoint in prod) |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `root` | MySQL user |
| `DB_PASSWORD` | `pandaTeya` | MySQL password |
| `DB_NAME` | `vet` | MySQL database name |
| `CORS_ORIGINS` | — | Comma-separated allowed origins (e.g. `http://localhost:5173`) |
| `JWT_SECRET_KEY` | `dev-secret-change-me` | JWT signing secret — **change in production** |
| `FLASK_APP` | — | Must be `backend.app` (run from project root) |
| `FLASK_DEBUG` | `0` | Set to `1` to enable auto-reload on file changes |

### Frontend (`frontend/.env`)

| Variable | Example | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:5000` | Backend base URL — browser makes direct requests |

### GitHub Actions Secrets (CI/CD)

| Secret | Description |
|--------|-------------|
| `AWS_ROLE_ARN` | GitHub Actions OIDC role ARN (no long-lived keys stored) |
| `ECR_BACKEND_URL` | Full ECR repository URL for backend image |
| `ECR_FRONTEND_URL` | Full ECR repository URL for frontend image |
| `DB_PASSWORD` | RDS master password (also passed to Terraform via `TF_VAR_db_password`) |
| `JWT_SECRET_KEY` | JWT signing key for production |

---

## API Reference

All protected endpoints require `Authorization: Bearer <access_token>`.

### Auth

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `POST` | `/users/authenticate` | No | Login — returns `access_token` + `refresh_token` |
| `POST` | `/users/refresh` | No | Exchange refresh token for a new access token |

**Login request:**
```json
{ "user_name": "admin", "password": "yourpassword" }
```

**Login response:**
```json
{ "access_token": "...", "refresh_token": "..." }
```

### Users

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `GET` | `/users/current` | Yes | Authenticated user's profile + pets |
| `GET` | `/users/all` | Yes | All customer-role users |
| `GET` | `/users/<user_name>` | Yes | Single user profile + pets |
| `POST` | `/users/add` | Yes | Create new user; returns one-time temp password |
| `PATCH` | `/users/<user_name>/role` | Yes | Update user's role assignment |

### Pets

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `GET` | `/pets/all` | Yes | All pets with owner + latest measurements |
| `GET` | `/pets/<pet_id>` | Yes | Full pet profile + measurement + visit history |
| `POST` | `/pets/add` | Yes | Create new pet record |

### Appointments

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `GET` | `/appointments/` | Yes | All appointments for `?date=YYYY-MM-DD` (excludes cancelled) |
| `GET` | `/appointments/resources` | Yes | Active vets + available clinic rooms |
| `POST` | `/appointments/` | Yes | Create appointment; `409` with `conflicts` array on overlap |
| `PATCH` | `/appointments/<appt_id>` | Yes | Cancel (`{status:"cancelled"}`) or reschedule; `409` on overlap |

**Appointment conflict response (409):**
```json
{
  "error": "conflict",
  "conflicts": [
    {
      "conflict_on": "vet",
      "vet_name": "Dr. Smith",
      "pet_name": "Buddy",
      "appointment_date": "2026-06-11T09:00:00",
      "duration_mins": 30
    }
  ]
}
```

**Appointment statuses:** `scheduled` | `completed` | `cancelled`

**Procedure types:** `wellness` | `vaccine` | `surgery` | `dental` | `bloodwork` | `followup` | `grooming`

### Visits & Shifts

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `GET` | `/visits/<visit_id>` | Yes | Get visit record (SOAP notes + prescriptions) |
| `GET` | `/shifts/` | Yes | Vet weekly schedule availability |

### Health

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `GET` | `/health` | No | Health check — used by Kubernetes liveness/readiness probes |

---

## Database Design

**Source of truth:** [`db/init/schema.sql`](db/init/schema.sql)

### Key conventions

- All primary keys are **`BINARY(16)` UUIDs** — never store as `VARCHAR`
- Always use `uuid_to_bin()` before inserting and `bin_to_uuid()` when reading (helpers in `backend/db/db_config.py`)
- **All SQL is raw text in `backend/db/repo.py`** — no SQLAlchemy ORM, no declarative models
- The connection engine lives on the Flask app object: `current_app.db_engine`

### Tables

| Table | Purpose |
|-------|---------|
| `users` | All clinic users (customers, vets, office staff) |
| `user_roles` | Role catalog: `customer`, `vet`, `office` |
| `user_role_assignments` | Many-to-many: users ↔ roles |
| `pet_types` | Pet type catalog (code + name): `dog`, `cat` |
| `breeds` | Breeds linked to `pet_types` |
| `pets` | Patient animals linked to owner user |
| `pet_measurements` | Weight, height, temperature history per visit |
| `clinic_rooms` | Exam rooms, lab, surgery suites (`room_type`: `exam`/`lab`/`surgery`) |
| `vet_appointments` | Pet + owner + vet + room, date, status, procedure type, duration |
| `vet_schedules` | Vet availability by `day_of_week` |
| `visits` | SOAP-style visit records linked to appointments |
| `prescriptions` | Drug prescriptions linked to visits |

### Conflict detection

The `check_appointment_conflicts` function in `repo.py` uses this SQL overlap condition:

```sql
appt_start < new_end AND appt_end > new_start
```

Returns `conflict_on: "vet" | "room"` so the UI can show a specific message like *"Dr. Smith is busy at this time — seeing Buddy (9:00am–9:30am)"*.

---

## Frontend Architecture

- **Single-page app** — React Router handles `/login` and `/` (catch-all to dashboard)
- **`AuthContext`** — provides `login()`, `logout()`, `token`, `isAuthenticated`; tokens stored in `localStorage`
- **`ProtectedRoute`** — wraps all authenticated pages; redirects to `/login` if not authenticated
- **`Dashboard`** — main shell component; owns active tab state and fetches owners + patients on mount
- **`apiFetch()`** in `src/api.js` — auto-injects `Authorization: Bearer <token>` header on every request; throws `Error` with `.status` (HTTP code) and `.responseData` (parsed JSON) on non-2xx responses

### Nav tabs (TopNav)

**Dashboard** | **Pet Owners** | **Patients** | **Appointments** | **Billing**

Settings is a gear icon button in the right-side toolbar.

### Appointments scheduler

- Day view with Y-axis time (8am–11pm), one column per vet and per room
- Past time slots grayed out and non-clickable when viewing today
- Live "now" line spans the full grid width using browser timezone (`Intl.DateTimeFormat`)
- `computeMaxDuration()` caps the duration input to avoid booking past the next appointment for the same resource

---

## CI/CD Pipeline

All pipelines are in [`.github/workflows/`](.github/workflows/).

### 1. PR Checks (`pr-checks.yml`) — runs on every pull request

| Step | What it checks |
|------|---------------|
| Frontend lint | ESLint — must pass with zero errors |
| Frontend audit | `npm audit` — flags high-severity vulnerabilities |
| Frontend build | `npm run build` — ensures production build succeeds |
| Backend lint | `ruff check backend/` |
| Backend audit | `pip-audit` — flags known CVEs in dependencies |
| Backend tests | `pytest tests/unit/` |

### 2. Continuous Deployment (`cd.yml`) — runs on push to `master`

**Phase 1 — Build & Test:**
1. Build Docker images for mysql, backend, frontend
2. Start all containers and wait for health checks
3. Run backend pytest (unit + e2e)
4. Smoke-test frontend (curl response contains HTML)
5. Security scan images with Trivy (CRITICAL severity threshold)

**Phase 2 — Push to ECR:**
1. Assume AWS role via GitHub OIDC (no stored access keys)
2. Build production backend image → push to ECR (tags: `git-<SHA>` + `latest`)
3. Build production frontend image (`Dockerfile.prod`) → push to ECR

### 3. Infrastructure (`terraform-apply.yml`) — manual trigger

1. **Bootstrap** — creates S3 bucket + DynamoDB table for Terraform remote state (idempotent)
2. **Apply** — runs `terraform apply` to provision VPC, EKS, RDS, ECR, IAM roles (~15 min)
3. Outputs ECR URLs, RDS endpoint, EKS cluster name to the GitHub Actions job summary

### 4. Deploy to EKS (`deploy-eks.yml`) — manual trigger

1. Install AWS Load Balancer Controller via Helm
2. Create `teyavet` namespace + Kubernetes Secrets
3. Apply ConfigMap with live RDS host (queried from AWS)
4. Run DB migration Job (applies `schema.sql` + `seed_data.sql`)
5. Apply Services + Ingress (triggers ALB provisioning)
6. Deploy backend + frontend (2 replicas each, rolling update)
7. Print final ALB DNS name

---

## Production Infrastructure (AWS)

Terraform configuration lives in [`infra/`](infra/). Managed state is stored in S3 + DynamoDB (provisioned by `infra/bootstrap/`).

### Provisioned resources

| Component | Technology | Details |
|-----------|-----------|---------|
| Compute | EKS (Kubernetes 1.31) | `t3.medium` nodes, 1–2 node autoscaling |
| Database | RDS MySQL 8 | `db.t3.micro`, private subnet, no public access |
| Registry | ECR | Private repos: `teyavet/backend`, `teyavet/frontend` |
| Network | VPC + ALB | `10.0.0.0/16`, 2 public + 2 private subnets across 2 AZs |
| Auth | IAM + OIDC | GitHub Actions federated identity — no long-lived AWS keys |

### Kubernetes layout (namespace: `teyavet`)

```
Ingress (ALB)
  ├── /users /pets /appointments /visits /shifts /health → backend-service:5000
  └── /                                                  → frontend-service:80

backend-deployment  (2 replicas, rolling update)
  └── ConfigMap: FLASK_APP, DB_HOST, CORS_ORIGINS
  └── Secret:    DB_PASSWORD, JWT_SECRET_KEY

frontend-deployment (2 replicas)
  └── Nginx serving compiled React SPA
```

---

## Commit Convention

Git hooks are activated with `make setup`. Every commit must follow this format:

```
[PREFIX] - your message here
```

| Prefix | Use for |
|--------|---------|
| `[FRONT]` | React / Vite frontend changes |
| `[BACK]` | Flask backend changes |
| `[CI]` | GitHub Actions workflows |
| `[DB]` | Schema, migrations, seed data |
| `[TEST]` | Tests |
| `[DOCS]` | README, documentation |
| `[INFRA]` | Docker, docker-compose, Terraform |
| `[FIX]` | Bug fixes |
| `[CHORE]` | Dependencies, cleanup, formatting |

**Examples:**
```bash
git commit -m "[BACK] - add POST /visits endpoint with SOAP notes"
git commit -m "[FRONT] - add pet photo upload to PetProfileView"
git commit -m "[INFRA] - increase EKS node max count to 4"
```

---

## Common Gotchas

- **UUID bytes** — Always use `uuid_to_bin()` / `bin_to_uuid()` in every query. Skipping this will silently corrupt data since raw bytes are not printable strings.

- **CORS + PATCH** — `PATCH` is not in flask-cors's default allowed methods. It must be explicitly listed in `CORS(app, methods=[...])`. Missing it causes the browser preflight to fail with a `NetworkError` rather than a 405, which makes it hard to diagnose.

- **Flask auto-reload in Docker** — `FLASK_ENV=development` is deprecated in Flask 2.x. Use `FLASK_DEBUG=1` instead. Without it, Python file changes require `docker compose restart backend`.

- **Import paths** — Backend imports use the `backend.xxx` package path (e.g. `from backend.db.repo import ...`). Flask must be run from the project root, not from inside the `backend/` directory.

- **DB schema changes** — Update `db/init/schema.sql` **and** write a migration script. Init scripts only run on a fresh Docker volume — existing volumes are not re-initialized automatically.

- **Password at user creation** — `add_user` auto-generates a temporary password and returns it once in the API response. It is never stored in plaintext. Make sure to copy it from the response.

- **Now-line timezone** — The `nowMins()` function in the appointments scheduler uses `Intl.DateTimeFormat` to read the browser's configured timezone. If the server or CI host is set to UTC and the user is in a different timezone, the now-line will appear in the wrong position. Fix with `sudo timedatectl set-timezone Asia/Jerusalem` (or the appropriate local timezone).

- **`apiFetch` error shape** — Errors thrown by `apiFetch()` have `.status` (HTTP code) and `.responseData` (full parsed JSON body). For 409 conflict handling: `err.status === 409 && err.responseData?.conflicts`.

- **Flask app context** — Services access `current_app.db_engine`. Calling service methods outside a request context (e.g. in scripts or tests without an app context) will raise a `RuntimeError`.
