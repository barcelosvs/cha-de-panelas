# Frontend build stage
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install
COPY frontend/ ./
RUN npm run build

# Python deps build stage (para wheels cache se necessário)
FROM python:3.13-slim AS python-build
WORKDIR /wheels
COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

# Final runtime image
FROM python:3.13-slim AS runtime
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app
# Instala dependências a partir dos wheels
COPY --from=python-build /wheels /wheels
RUN pip install --no-cache-dir /wheels/* && pip install --no-cache-dir waitress
# Copia código
COPY . .
# Copia frontend build
COPY --from=frontend-build /app/frontend/dist /app/frontend_dist
# Cria usuário não root
RUN useradd -u 1001 -m appuser && chown -R appuser:appuser /app
USER appuser
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python -c "import urllib.request,sys;\n\n\n\n\n\n\n\nimport json;\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nurl='http://127.0.0.1:5000/api/status';\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nresp=urllib.request.urlopen(url,timeout=2);\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nprint(json.loads(resp.read().decode()).get('status')=='ok') or sys.exit(1)" || exit 1
CMD ["waitress-serve", "--host=0.0.0.0", "--port=5000", "app:app"]
