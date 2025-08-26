# Backend + build frontend multi-stage
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --frozen-lockfile || npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.13-slim AS backend
ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Copia build front para pasta servida por nginx ou por flask (static)
RUN mkdir -p /app/frontend_dist && cp -r frontend/dist/* /app/frontend_dist/ || true

# Produção: usar waitress (WSGI)
RUN pip install waitress
EXPOSE 5000
CMD ["waitress-serve", "--host=0.0.0.0", "--port=5000", "app:app"]
