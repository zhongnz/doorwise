# DoorWise — Google Cloud Run Dockerfile
# Multi-stage build: React frontend + Python FastAPI backend

# Stage 1: Build React frontend
FROM node:20-slim AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Python backend + serve frontend
FROM python:3.12-slim
WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend
COPY backend/ ./backend/

# Copy built frontend
COPY --from=frontend-build /app/dist ./static/

# Expose port
ENV PORT=8080
EXPOSE 8080

# Run with uvicorn
CMD ["sh", "-c", "python -m uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
