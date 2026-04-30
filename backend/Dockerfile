# Backend Dockerfile - Flask API
FROM python:3.10-slim

WORKDIR /app

# Copy application code first (to leverage caching)
COPY . .

# Copy and install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -U pip setuptools && \
    pip install --no-cache-dir -r requirements.txt

# Expose Flask port
EXPOSE 5000

# Run Flask application  
ENV PYTHONUNBUFFERED=1
CMD ["python", "-m", "flask", "run", "--host=0.0.0.0"]
