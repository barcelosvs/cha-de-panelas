# Chá de Panelas

Aplicação completa (frontend + backend) para gerenciamento de confirmação de presença (RSVP) e escolha de itens de um chá de panelas.

## Visão Geral

- **Backend**: Flask + SQLite (transações para reserva de itens, SSE para atualização em tempo real, cache em memória + ETag, rate limiting, logging JSON).
- **Frontend**: React (Vite + Tailwind) com code splitting, tema claro/escuro, componentes reutilizáveis e SSE para atualização de itens e estatísticas.
- **Deploy Frontend**: Netlify
- **Deploy Backend**:

## Recursos

- RSVP com validação e honeypot anti-spam.
- Lista de itens disponíveis com reserva atômica (conflitos tratados).
- Admin protegido por senha (hash bcrypt via variável de ambiente).
- Liberação e remoção de convidados.
- Estatísticas + barra de progresso (% de itens já escolhidos).
- SSE (Server-Sent Events) para atualização em tempo quase real (itens e stats).
- Cache em memória dos itens (TTL) e cabeçalhos HTTP (ETag + Cache-Control).
- Logging estruturado e índices/constraints no banco.
- UI responsiva com dark mode (switch sol/lua) e toasts.

## Estrutura Principal

```
app.py                # API Flask
db.py                 # Acesso e operações no SQLite
frontend/             # Aplicação React
  src/
    pages/App.jsx
    pages/AdminPanel.jsx
    components/*
    hooks/*
netlify.toml          # Configuração Netlify (frontend)
Dockerfile            # Build multi-stage (frontend + backend)
requirements.txt      # Dependências produção backend
requirements-dev.txt  # Dependências desenvolvimento/testes
```

## Variáveis de Ambiente (Backend)

| Variável            | Descrição                                         | Padrão            |
| ------------------- | ------------------------------------------------- | ----------------- |
| ADMIN_PASSWORD      | Senha admin em texto plano (se hash não definido) | `admin1308`       |
| ADMIN_PASSWORD_HASH | Hash bcrypt da senha admin                        | gerado em runtime |
| ALLOWED_ORIGIN      | Origem permitida para CORS (`https://...`)        | `*` dev           |
| ITENS_TTL           | TTL de cache (segundos) para itens / status       | `15`              |

Recomendado definir apenas `ADMIN_PASSWORD_HASH` em produção (gerar com `python -c "import bcrypt;print(bcrypt.hashpw(b'NovaSenha', bcrypt.gensalt()).decode())"`).

## Variáveis de Ambiente (Frontend / Netlify)

Defina (Netlify UI ou em `[build.environment]`):

```
VITE_API_URL=https://SEU-BACKEND/api
```

Se usar redirects (ver `netlify.toml`), `/api/*` será proxied automaticamente.

## Desenvolvimento

### Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
python app.py  # http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev  # http://localhost:5173
```

Proxy de desenvolvimento atende `http://localhost:5173/api -> http://localhost:5000`.

## Testes

(Exemplo de testes já para escolha de item.)

```bash
pytest -q
```

## Docker (Build Total)

```bash
docker build -t cha-panelas .
docker run -p 5000:5000 -e ADMIN_PASSWORD_HASH=... cha-panelas
```

Frontend compilado é copiado para `/app/frontend_dist` (pode servir estático via CDN separado se desejar).

## Deploy Frontend (Netlify)

1. Ajuste `netlify.toml` substituindo domínio do backend em `[[redirects]]`.
2. Configure `VITE_API_URL` no painel Netlify.
3. Conecte o repositório e faça deploy (build usa `npm run build --prefix frontend`).

## Deploy Backend (Fly.io Exemplo)

```bash
fly launch  # responder perguntas
fly secrets set ADMIN_PASSWORD_HASH=... ITENS_TTL=15
fly deploy
```

Atualize a URL no frontend (`VITE_API_URL`).

## SSE / Tempo Real

Endpoint: `/api/stream`.
Eventos enviados:

- `hello` (abertura)
- `ping` (heartbeat 15s)
- `itens_update` (invalidação após escolher/liberar/remover)
- `stats_update`

## Segurança

- Bcrypt hash para senha admin.
- Rate limiting RSVP.
- Honeypot no formulário.
- CORS restrito configurável.
- Uso de parâmetros tipados e validações de integridade (unique + índices).

## Melhorias Futuras (Ideias)

- Autenticação admin com token temporário (JWT/Session) em vez de header senha.
- Paginação / virtualização lista admin.
- PWA (manifest + offline cache).
- i18n.
- Testes e2e (Playwright) e monitoramento (Sentry).

## Licença

Uso interno / pessoal. Ajuste conforme necessidade.

---

Qualquer dúvida ou sugestão, abra uma issue.
