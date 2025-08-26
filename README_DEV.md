# Dev & Tooling

## Makefile

- `make dev` roda backend (Flask) e frontend (Vite) (bloqueia após backend terminar)
- `make backend` apenas backend
- `make frontend` apenas frontend
- `make build` build frontend
- `make test` pytest
- `make lint` ruff + eslint
- `make type` mypy

## Qualidade

- Testes unitários: pytest em `tests/`
- Planejado: testes e2e (Playwright) -> instalar: `npm i -D @playwright/test` e criar spec.
- Lighthouse: usar Chrome DevTools ou `npm i -g lighthouse`.

## Observabilidade

- Logs JSON já configurados.
- Para Sentry: `pip install sentry-sdk` e no app:

```python
import sentry_sdk
sentry_sdk.init(dsn=os.environ['SENTRY_DSN'], traces_sample_rate=0.1)
```

## Internacionalização

- Estratégia simples: dicionário JS e contexto React para strings.
- Alternativa: `react-intl`.

## Docker

- `docker-compose up --build`
- Serve backend via waitress.

## Migrações

- Futuro: Alembic: `pip install alembic` -> `alembic init migrations`.

## Backup DB

Exemplo cron (diário):

```
0 2 * * * cp /caminho/app/cha_panelas.db /caminho/backups/cha_panelas-`date +\%F`.db
```
