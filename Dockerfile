# ==============================================================================
# AUREN SOLIAN — Unified Multi-Stage Production Container
# ==============================================================================

# Stage 1: Build Frontend Assets
FROM node:22-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python Backend Runtime
FROM python:3.11-slim AS runtime
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Install dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/app ./app

# Copy compiled frontend distribution to serve as static assets
COPY --from=frontend-builder /build/dist ./dist

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
