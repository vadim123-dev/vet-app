# Use official MySQL 8 image
FROM mysql:8.0

# Set environment variables
ENV MYSQL_DATABASE=vet

# Copy initialization scripts
COPY init/schema.sql /docker-entrypoint-initdb.d/01-schema.sql
COPY init/seed_data.sql /docker-entrypoint-initdb.d/02-seed_data.sql

# Expose MySQL port
EXPOSE 3306
