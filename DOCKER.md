# Docker Setup for Vet App

## Quick Start

### Start all services
```bash
docker-compose up --build
```

This will:
- Build and start MySQL database (port 3306)
- Build and start Flask backend (port 5000)
- Build and start React frontend (port 5173)

### Services

- **Database**: MySQL 8.0 at `mysql:3306` (container) or `localhost:3306` (host)
  - User: `root`
  - Password: `pandaTeya`
  - Database: `vet`

- **Backend**: Flask API at `http://localhost:5000`
  - Python 3.13
  - Auto-reloads on code changes (volume mounted)

- **Frontend**: React + Vite at `http://localhost:5173`
  - Node 20 Alpine
  - Production build served

## Common Commands

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild all images
docker-compose up --build

# Rebuild specific service
docker-compose up --build backend

# Access MySQL CLI
docker exec -it mysql8 mysql -u root -ppandaTeya vet

# Shell into backend container
docker exec -it vet-backend /bin/bash
```

## Network

All services communicate via the `vet-network` bridge network:
- Backend reaches MySQL via hostname `mysql`
- Frontend reaches Backend via hostname `backend` or `localhost:5000` from host

## Volumes

- `mysql_data`: Persists database data between container restarts
- Backend code: Volume-mounted for hot-reload during development

## Notes

- Health checks ensure MySQL is ready before backend connects
- Backend depends on MySQL being healthy
- Frontend depends on backend being started
