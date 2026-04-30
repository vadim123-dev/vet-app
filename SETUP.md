# Vet App - Development Setup

## Project Structure

```
vet-app/
├── docker-compose.yml          # Root orchestration (all services)
├── backend/
│   ├── Dockerfile              # Backend container config
│   ├── requirements.txt         # Python dependencies
│   ├── app.py                   # Flask entry point
│   ├── config.py
│   ├── models/                  # Data models
│   ├── services/                # Business logic
│   ├── routes/                  # API endpoints
│   └── utils/
├── frontend/
│   ├── Dockerfile              # Frontend container config
│   ├── package.json             # Node dependencies
│   ├── vite.config.js           # Vite build config
│   ├── src/
│   │   ├── api.js               # API client
│   │   ├── App.jsx              # Main component
│   │   └── auth/
│   └── index.html
└── db/
    ├── Dockerfile              # Database container config
    ├── docker-compose.yml       # Local database compose (optional)
    ├── init/
    │   ├── schema.sql           # Database schema
    │   └── seed_data.sql        # Initial data
    └── db_config.py             # DB connection config
```

## Local Development (Without Docker)

### 1. Start MySQL Database

```bash
cd db
docker compose up -d
# or if using the installed MySQL:
mysql -u root -ppandaTeya vet < init/schema.sql
mysql -u root -ppandaTeya vet < init/seed_data.sql
```

### 2. Start Backend

```bash
# Install Python dependencies (one-time)
pip install -r backend/requirements.txt

# Run Flask app
cd backend
export FLASK_APP=app.py
export DB_HOST=127.0.0.1  # Use localhost for local dev
flask run
# Backend runs on http://localhost:5000
```

### 3. Start Frontend

```bash
# Install Node dependencies (one-time)
cd frontend
npm install

# Run dev server
npm run dev
# Frontend runs on http://localhost:5173
```

## Docker Setup (Complete Stack)

**Note**: Docker build may take time on first run.

```bash
# Build and start all services
docker compose up --build

# Services will be available at:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:5000
# - MySQL: localhost:3306

# View logs
docker compose logs -f

# Stop services
docker compose down
```

## Environment Variables

### Backend (.env or export)
```bash
DB_HOST=127.0.0.1      # or 'mysql' in Docker
DB_PORT=3306
DB_USER=root
DB_PASSWORD=pandaTeya
DB_NAME=vet
FLASK_ENV=development
CORS_ORIGINS=http://localhost:5173
```

### Frontend
```bash
VITE_API_URL=http://localhost:5000
```

## Database

### Connection Details
- **Host**: 127.0.0.1 (local) or `mysql` (Docker)
- **Port**: 3306
- **User**: root
- **Password**: pandaTeya
- **Database**: vet

### Access MySQL CLI

```bash
# Local
mysql -u root -ppandaTeya vet

# Docker
docker exec -it mysql8 mysql -u root -ppandaTeya vet
```

## API Endpoints

### Users
- `POST /users/authenticate` - Login
- `GET /users/current` - Get current user (requires JWT)
- `GET /users/all` - List all users (requires JWT)
- `POST /users/add` - Create new user (requires JWT)

### Pets
- Routes skeleton exists but not yet implemented

## Development Workflow

1. **Backend changes**: Edit files in `backend/`, Flask auto-reloads
2. **Frontend changes**: Edit files in `frontend/`, Vite hot-reloads
3. **Database schema changes**: Update `db/init/schema.sql`, restart MySQL
4. **Dependencies**:
   - Python: Update `backend/requirements.txt`, reinstall
   - Node: Update `frontend/package.json`, run `npm install`

## Troubleshooting

**Backend can't connect to DB**
- Ensure MySQL is running on port 3306
- Check `DB_HOST` environment variable
- Verify credentials match (root/pandaTeya)

**Frontend can't reach API**
- Ensure backend is running on port 5000
- Check CORS_ORIGINS setting in backend
- Verify `VITE_API_URL` matches backend address

**Port already in use**
- MySQL: `lsof -i :3306 | grep LISTEN`
- Backend: `lsof -i :5000 | grep LISTEN`
- Frontend: `lsof -i :5173 | grep LISTEN`
- Kill process: `kill -9 <PID>`

## Next Steps

1. Implement pet routes/endpoints
2. Connect frontend authentication with backend
3. Add real pet management features
4. Implement health checks and metrics
