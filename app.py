from flask import Flask, request, jsonify # type: ignore
from flask_cors import CORS # type: ignore
from db import init_db, list_itens_disponiveis, list_convidados, create_convidado, escolher_item, liberar_item, get_stats, remover_convidado, check_nome_exists
import os
import bcrypt
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging, json, time
from functools import wraps

# Config
ADMIN_PASSWORD_PLAIN = os.environ.get('ADMIN_PASSWORD', 'admin1308')
ADMIN_PASSWORD_HASH = os.environ.get('ADMIN_PASSWORD_HASH')
if not ADMIN_PASSWORD_HASH:
    # Gera hash em memória (em produção gerar antes e setar via env)
    ADMIN_PASSWORD_HASH = bcrypt.hashpw(ADMIN_PASSWORD_PLAIN.encode(), bcrypt.gensalt()).decode()

ALLOWED_ORIGIN = os.environ.get('ALLOWED_ORIGIN')  # ex: https://meusite.com

app = Flask(__name__)

# CORS: se origem específica configurada usa ela, senão mantém * para desenvolvimento
if ALLOWED_ORIGIN:
    CORS(app, resources={r"/api/*": {"origins": [ALLOWED_ORIGIN]}}, supports_credentials=False)
else:
    CORS(app, resources={r"/api/*": {"origins": "*"}})

limiter = Limiter(get_remote_address, app=app, default_limits=[])

# Logging JSON estruturado
class JsonFormatter(logging.Formatter):
    def format(self, record):
        base = {
            'level': record.levelname,
            'time': time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime()),
            'message': record.getMessage(),
            'logger': record.name
        }
        if record.exc_info:
            base['exc_info'] = self.formatException(record.exc_info)
        return json.dumps(base, ensure_ascii=False)

handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
app.logger.handlers = [handler]
app.logger.setLevel(logging.INFO)

# Util

def check_admin(pw: str | None) -> bool:
    if not pw:
        return False
    try:
        return bcrypt.checkpw(pw.encode(), ADMIN_PASSWORD_HASH.encode())
    except Exception:
        return False

@app.get('/api/status')
def status():
    stats = get_stats()
    stats['itens_disponiveis_list'] = list_itens_disponiveis()
    return jsonify(stats)

_itens_cache = { 'data': None, 'ts': 0 }
_ITENS_TTL = 15  # segundos

def cached_itens():
    now = time.time()
    if _itens_cache['data'] is not None and (now - _itens_cache['ts']) < _ITENS_TTL:
        return _itens_cache['data']
    data = list_itens_disponiveis()
    _itens_cache['data'] = data
    _itens_cache['ts'] = now
    return data

def invalidate_itens_cache():
    _itens_cache['data'] = None
    _itens_cache['ts'] = 0

@app.before_request
def _req_log():
    request.start_time = time.time()

@app.after_request
def _after(resp):
    dur = (time.time() - getattr(request, 'start_time', time.time())) * 1000
    app.logger.info(f"REQ method={request.method} path={request.path} status={resp.status_code} dur_ms={dur:.1f}")
    return resp

@app.get('/api/itens')
def get_itens():
    return jsonify(cached_itens())

@app.get('/api/convidados')
def get_convidados():
    pw = request.headers.get('X-Admin-Password')
    if not check_admin(pw):
        return jsonify({"error": "Unauthorized"}), 401
    filtro = request.args.get('q')
    return jsonify(list_convidados(filtro))

@app.post('/api/rsvp')
@limiter.limit("5 per 5 minutes")
def rsvp():
    data = request.get_json(force=True)
    # Honeypot: campo oculto esperado vazio
    honeypot = data.get('apelido', '').strip()
    if honeypot:
        app.logger.warning('Honeypot acionado')
        return jsonify({"error": "Spam detectado"}), 400
    nome = data.get('nome', '').strip()
    if not nome:
        return jsonify({"error": "Nome é obrigatório"}), 400
    duplicado = check_nome_exists(nome)
    try:
        convidado_id = create_convidado(nome)
        app.logger.info(f'Novo RSVP id={convidado_id} nome="{nome}" duplicado={duplicado}')
        return jsonify({"ok": True, "convidado_id": convidado_id, "duplicado": duplicado})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

@app.post('/api/escolha')
def escolha():
    data = request.get_json(force=True)
    convidado_id = data.get('convidado_id')
    item_id = data.get('item_id')
    if not isinstance(convidado_id, int) or not isinstance(item_id, int):
        return jsonify({"error": "convidado_id e item_id devem ser inteiros"}), 400
    ok = escolher_item(convidado_id, item_id)
    if not ok:
        app.logger.info(f'Conflito escolha convidado={convidado_id} item={item_id}')
        return jsonify({"ok": False, "error": "Item já foi escolhido por outra pessoa"}), 409
    invalidate_itens_cache()
    app.logger.info(f'Escolha registrada convidado={convidado_id} item={item_id}')
    return jsonify({"ok": True})

@app.post('/api/admin/reset')
def admin_reset():
    pw = request.headers.get('X-Admin-Password')
    if not check_admin(pw):
        return jsonify({"error": "Unauthorized"}), 401
    init_db()
    app.logger.warning('Reset de banco executado')
    return jsonify({"ok": True})

@app.post('/api/admin/liberar')
def admin_liberar():
    pw = request.headers.get('X-Admin-Password')
    if not check_admin(pw):
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json(force=True)
    convidado_id = data.get('convidado_id')
    if not isinstance(convidado_id, int):
        return jsonify({'error': 'convidado_id inválido'}), 400
    ok = liberar_item(convidado_id)
    if not ok:
        return jsonify({'ok': False, 'error': 'Nada para liberar'}), 400
    invalidate_itens_cache()
    app.logger.info(f'Item liberado convidado={convidado_id}')
    return jsonify({'ok': True})

@app.post('/api/admin/remover')
def admin_remover():
    pw = request.headers.get('X-Admin-Password')
    if not check_admin(pw):
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json(force=True)
    convidado_id = data.get('convidado_id')
    if not isinstance(convidado_id, int):
        return jsonify({'error': 'convidado_id inválido'}), 400
    ok = remover_convidado(convidado_id)
    if not ok:
        return jsonify({'ok': False, 'error': 'Convidado não encontrado'}), 404
    invalidate_itens_cache()
    app.logger.info(f'Convidado removido id={convidado_id}')
    return jsonify({'ok': True})

@app.get('/api/admin/stats')
def admin_stats():
    pw = request.headers.get('X-Admin-Password')
    if not check_admin(pw):
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(get_stats())

@app.get('/')
def health():
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    # init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
