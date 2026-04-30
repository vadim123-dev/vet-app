# TeyaVet — Vet Clinic Management App

Full-stack veterinary clinic management system. Clinic staff manage pet owners, patient records, measurements, and appointments.

---

## Stack

| Layer    | Technology                                      |
|----------|-------------------------------------------------|
| Backend  | Python 3.13, Flask, Flask-JWT-Extended, SQLAlchemy 2.x, PyMySQL |
| Frontend | React 18, Vite, plain CSS (no UI framework)     |
| Database | MySQL 8 (InnoDB, utf8mb4)                       |
| Infra    | Docker Compose (3 services: mysql, backend, frontend) |

---

## Project Layout

```
vet-app/
├── backend/              # Flask API
│   ├── app.py            # App factory (_create_app), global db_engine, CORS config
│   ├── config.py         # JWT config, external API URLs
│   ├── db/
│   │   ├── db_config.py  # DBConfig dataclass, SQLAlchemy engine, UUID helpers
│   │   └── repo.py       # ALL raw SQL queries — no ORM, returns plain dicts
│   ├── models/           # Python model classes (User, Pet, Animal, Cat, Dog)
│   ├── repositories/     # user_repository.py
│   ├── routes/           # Flask Blueprints: user_routes, pet_routes, appointment_routes
│   ├── services/         # Business logic: auth_service, user_data_service, animal_data_service
│   └── utils/            # auth_utils (password generation)
├── frontend/             # React/Vite SPA
│   └── src/
│       ├── api.js         # apiFetch() — auto-injects Bearer token; attaches err.status + err.responseData on failure
│       ├── auth/          # AuthContext, ProtectedRoute
│       ├── components/    # TopNav (5 tabs + settings gear icon), TeyaLogo
│       └── pages/         # LoginPage, Dashboard, DashboardPage, PetOwnersPage, PatientsPage,
│                          # PetProfileView, AppointmentsPage, NewAppointmentModal, RescheduleModal
├── db/
│   ├── init/schema.sql    # Source of truth for DB schema
│   ├── init/seed_data.sql # Initial data
│   └── docker-compose.yml # DB-only compose (for local dev without full stack)
└── docker-compose.yml     # Full stack compose
```

---

## Running the App

### Docker (recommended — full stack)
```bash
docker compose up --build        # first run
docker compose up                # subsequent runs
docker compose down              # stop
docker compose down -v           # stop + wipe DB volume
docker compose restart backend   # pick up Python file changes (auto-reload requires FLASK_DEBUG=1)
```

### Local development
```bash
# Start DB only
docker compose up mysql

# Backend (from project root — imports are backend.xxx)
cd backend && flask run           # or: python -m flask --app backend.app run

# Frontend
cd frontend && npm run dev        # http://localhost:5173
```

### Environment variables
- Backend reads from `backend/.env`
- `CORS_ORIGINS=http://localhost:5173,http://frontend:5173` (comma-separated)
- `JWT_SECRET_KEY` — defaults to `"dev-secret-change-me"` if not set
- `FLASK_DEBUG=1` — enables auto-reload on file changes (set in docker-compose.yml)
- DB defaults: host=`127.0.0.1`, port=`3306`, user=`root`, password=`pandaTeya`, db=`vet`
- In Docker: `DB_HOST=mysql` (container name), everything else same
- Frontend: `VITE_API_URL=http://localhost:5000` (browser hits backend directly, bypassing Vite proxy)
- Frontend: `VITE_BACKEND_URL=http://backend:5000` (Vite server-side proxy target)

---

## Database Design

### Key conventions
- All primary keys are **BINARY(16) UUIDs** — never store as VARCHAR
- Use `uuid_to_bin()` before inserting, `bin_to_uuid()` after reading (both in `db/db_config.py`)
- All SQL is raw text in `db/repo.py` — no ORM models, no SQLAlchemy declarative base
- The `db_engine` lives on the Flask app object: `current_app.db_engine`

### Tables
| Table                  | Purpose                                                   |
|------------------------|-----------------------------------------------------------|
| `users`                | All users (customers, vets, office staff)                 |
| `user_roles`           | Role definitions: `customer`, `vet`, (office planned)     |
| `user_role_assignments`| Many-to-many: users ↔ roles                               |
| `pet_types`            | `dog`, `cat`, etc. (code + name)                          |
| `breeds`               | Linked to `pet_types`                                     |
| `pets`                 | Owner link, type, breed, birth date                       |
| `pet_measurements`     | weight_kg, height_cm, temperature_celsius per visit       |
| `clinic_rooms`         | `exam` / `lab` / `surgery` rooms                          |
| `vet_appointments`     | pet + owner + vet + room, status, procedure_type, duration_mins |
| `vet_schedules`        | Vet availability by day_of_week                           |

### Appointment statuses: `scheduled` | `completed` | `cancelled`
### Procedure types: `wellness` | `vaccine` | `surgery` | `dental` | `bloodwork` | `followup` | `grooming`

---

## API Endpoints

All protected endpoints require `Authorization: Bearer <access_token>`.

| Method | Path                         | Auth | Description                                      |
|--------|------------------------------|------|--------------------------------------------------|
| POST   | `/users/authenticate`        | No   | Login → access + refresh tokens                  |
| POST   | `/users/refresh`             | No   | Refresh access token                             |
| GET    | `/users/current`             | Yes  | Current user + pets (from JWT)                   |
| GET    | `/users/all`                 | Yes  | All customer-role users                          |
| GET    | `/users/<user_name>`         | Yes  | One user + pets                                  |
| POST   | `/users/add`                 | Yes  | Create user (admin only by role)                 |
| GET    | `/pets/all`                  | Yes  | All pets with owner + measurements               |
| GET    | `/pets/<pet_id>`             | Yes  | Full pet profile + history                       |
| GET    | `/appointments/`             | Yes  | Appointments for `?date=YYYY-MM-DD` (excludes cancelled) |
| GET    | `/appointments/resources`    | Yes  | Active vets + clinic rooms                       |
| POST   | `/appointments/`             | Yes  | Create appointment; 409 with `conflicts` array if overlap |
| PATCH  | `/appointments/<appt_id>`    | Yes  | Cancel (`{status:"cancelled"}`) or reschedule; 409 on overlap |

---

## Auth Design

- JWT identity = `user_name` (string)
- Access token TTL: **15 minutes**
- Refresh token TTL: **7 days**
- Tokens stored in **localStorage** on the frontend
- `apiFetch()` in `frontend/src/api.js` auto-injects the Bearer header
- On non-2xx: throws `Error` with `err.status` (HTTP status) and `err.responseData` (parsed JSON body)
- `VITE_API_URL` env var controls the backend base URL (empty = same origin)

---

## Frontend Architecture

- Single-page app, no React Router — tab state lives in `Dashboard.jsx`
- `AuthContext` provides `login()`, `logout()`, `token`, `isAuthenticated`
- `ProtectedRoute` wraps all authenticated pages
- `Dashboard` is the shell: owns `active` tab state, fetches owners + patients on mount
- Default landing tab after login: **Dashboard** (`active = "dashboard"`)
- `PetProfileView` is rendered inside the patients tab (not a route)

### Nav tabs (TopNav)
5 main tabs: **Dashboard** | **Pet Owners** | **Patients** | **Appointments** | **Billing**
Settings moved to a gear icon button in the right-side toolbar (next to bell).
`Medical Records` tab removed.

### Pages
| Page | File | Data source |
|------|------|-------------|
| Dashboard (cockpit) | `DashboardPage.jsx` | Real: `/appointments/`, `/appointments/resources`, `/users/current`. Static mock: boarders, staff, reminders, inventory, activity feed |
| Pet Owners | `PetOwnersPage.jsx` | `/users/all` |
| Patients | `PatientsPage.jsx` | `/pets/all` |
| Pet Profile | `PetProfileView.jsx` | `/pets/<pet_id>` |
| Appointments | `AppointmentsPage.jsx` | `/appointments/resources` + `/appointments/?date=` |
| New Appointment | `NewAppointmentModal.jsx` | POST `/appointments/` |
| Reschedule | `RescheduleModal.jsx` | PATCH `/appointments/<id>` |

---

## Appointments Scheduler

- **Day view**: time on Y axis (8am–11pm), one column per vet + per room
- `DAY_START = 8*60`, `DAY_END = 23*60`, `SLOT_MINS = 30`, `PX_PER_MIN = 1.6`
- Past time slots (before current time) are grayed out and non-clickable when today is selected
- **Now-line**: spans full grid width; time label uses `Intl.DateTimeFormat` with browser timezone (12h am/pm format matching the grid)
- `nowMins()` uses `Intl.DateTimeFormat` explicitly rather than `getHours()` to respect browser timezone over system UTC
- The `now` value is computed fresh on every render (not stored in state) to avoid stale values after HMR

### Conflict detection (`repo.py: check_appointment_conflicts`)
- SQL overlap condition: `appt_start < new_end AND appt_end > new_start`
- Returns list of conflicting appointments with `conflict_on: "vet" | "room"`, `vet_name`, `pet_name`, `appointment_date`, `duration_mins`
- POST/PATCH both run this check; PATCH excludes the appointment being rescheduled
- Frontend shows: *"Dr. Smith is busy at this time — seeing Buddy (9:00am–9:30am)"*

### Max duration enforcement (frontend)
- When date + time + vet/room are selected, `NewAppointmentModal` and `RescheduleModal` fetch that day's appointments
- `computeMaxDuration()` finds the nearest next appointment for the same resource and caps the duration input
- Duration input gets `max={maxDuration}` and auto-corrects if time/resource change tightens the window

### Cancel & reschedule
- **Cancel**: inline confirmation banner in `ApptDetailPopover` → PATCH with `{status:"cancelled"}` → refresh grid
- **Reschedule**: opens `RescheduleModal` pre-filled with existing data → PATCH → refresh grid
- Cancelled appointments are excluded from `GET /appointments/` response

---

## CORS

Backend uses `flask-cors` configured in `app.py`:
```python
CORS(app,
     origins=allowed_origins,
     methods=["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Authorization", "Content-Type"])
```
`PATCH` must be explicitly listed — it is not in flask-cors's default methods and will fail the browser preflight without it.

---

## Roadmap

In rough priority order:
1. Role-based access control (vet / office / customer checks on endpoints)
2. Customer appointment scheduling UI (owner portal)
3. Pet health evaluation against normal ranges (temp, weight, height)
4. Background thread: checkup reminder logic
5. Email notifications to customers
6. AWS Cognito optional 2FA
7. Vet summaries stored to AWS S3 after appointments
8. AI-evaluated emails
9. Redis for caching / session
10. Java microservice integration via RabbitMQ
11. Webhooks

---

## Common Gotchas

- **UUID bytes**: always use `uuid_to_bin()` / `bin_to_uuid()` — raw bytes will silently corrupt if you skip this
- **CORS + PATCH**: `PATCH` requires explicit listing in flask-cors `methods`; missing it causes browser preflight to fail with a NetworkError (not a 405)
- **Flask auto-reload in Docker**: `FLASK_ENV=development` is deprecated in Flask 2.x; use `FLASK_DEBUG=1` instead. Without it, Python file changes require `docker compose restart backend`
- **Flask app context**: services use `current_app.db_engine` — calling service methods outside a request context will fail
- **Import paths**: backend imports use `backend.xxx` (e.g. `from backend.db.repo import ...`) — running flask must be from the project root, not from inside `backend/`
- **DB schema changes**: update `db/init/schema.sql` AND create a migration script; init scripts only run on a fresh volume
- **Password at user creation**: `add_user` auto-generates a temp password and returns it once — it is never stored in plaintext again
- **Now-line timezone**: `nowMins()` uses `Intl.DateTimeFormat` so it reads the browser's configured timezone. If the Linux system clock is set to UTC and the user is in a different timezone, they need `sudo timedatectl set-timezone Asia/Jerusalem` (or their local timezone)
- **`apiFetch` error shape**: errors throw with `err.status` (HTTP code) and `err.responseData` (full parsed JSON) — use `err.status === 409 && err.responseData?.conflicts` to handle scheduling conflicts
