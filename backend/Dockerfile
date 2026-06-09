# Backend Dockerfile - Flask API
FROM python:3.10-slim

WORKDIR /app

# Install dependencies first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -U pip setuptools && \
    pip install --no-cache-dir -r requirements.txt

# Copy source into backend/ so internal imports (from backend.xxx) resolve
COPY . ./backend/

# Create non-root user
RUN useradd --no-create-home --shell /bin/false appuser
USER appuser

# Expose Flask port
EXPOSE 5000

ENV PYTHONUNBUFFERED=1
CMD ["python", "-m", "flask", "run", "--host=0.0.0.0"]
