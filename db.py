import sqlite3
from contextlib import contextmanager
import logging

DB_PATH = 'cha_panelas.db'

@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH, timeout=10, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS itens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome_item TEXT NOT NULL UNIQUE,
                disponivel INTEGER NOT NULL DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS convidados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                item_escolhido INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(item_escolhido) REFERENCES itens(id)
            );
            """
        )
        # Índices (idempotentes)
        try:
            conn.execute('CREATE UNIQUE INDEX IF NOT EXISTS ux_convidados_nome ON convidados(nome)')
        except Exception as e:
            logging.warning(f'Não foi possível criar índice único em convidados.nome: {e}')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_convidados_item ON convidados(item_escolhido)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_convidados_created_at ON convidados(created_at)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_itens_disponivel ON itens(disponivel)')
        # Insere itens padrão se tabela vazia
        cur = conn.execute("SELECT COUNT(*) AS c FROM itens")
        if cur.fetchone()[0] == 0:
            itens_iniciais = [
                ('Pratos descartáveis',),
                ('Copos descartáveis',),
                ('Guardanapos',),
                ('Talheres plásticos',),
                ('Refrigerante',),
                ('Suco',),
                ('Água',),
                ('Bolo',),
                ('Salgadinhos',),
                ('Docinhos',)
            ]
            conn.executemany("INSERT INTO itens (nome_item) VALUES (?)", itens_iniciais)

def list_itens_disponiveis():
    with get_conn() as conn:
        cur = conn.execute("SELECT id, nome_item FROM itens WHERE disponivel = 1 ORDER BY nome_item")
        return [dict(row) for row in cur.fetchall()]

def list_convidados(filtro: str | None = None):
    with get_conn() as conn:
        if filtro:
            like = f"%{filtro.lower()}%"
            cur = conn.execute(
                """
                SELECT c.id, c.nome, i.nome_item AS item, c.created_at
                FROM convidados c
                LEFT JOIN itens i ON i.id = c.item_escolhido
                WHERE lower(c.nome) LIKE ?
                ORDER BY c.created_at DESC
                """,
                (like,)
            )
        else:
            cur = conn.execute(
                """
                SELECT c.id, c.nome, i.nome_item AS item, c.created_at
                FROM convidados c
                LEFT JOIN itens i ON i.id = c.item_escolhido
                ORDER BY c.created_at DESC
                """
            )
        return [dict(row) for row in cur.fetchall()]

def create_convidado(nome: str) -> int:
    nome = nome.strip()
    if not nome:
        raise ValueError('Nome não pode ser vazio')
    with get_conn() as conn:
        try:
            cur = conn.execute("INSERT INTO convidados (nome) VALUES (?)", (nome,))
            return cur.lastrowid
        except sqlite3.IntegrityError as e:
            # Pode ser violação de unique
            if 'unique' in str(e).lower():
                raise ValueError('Nome já cadastrado')
            raise

def escolher_item(convidado_id: int, item_id: int) -> bool:
    with get_conn() as conn:
        try:
            conn.execute('BEGIN IMMEDIATE')
            cur = conn.execute("SELECT item_escolhido FROM convidados WHERE id = ?", (convidado_id,))
            row = cur.fetchone()
            if row is None:
                conn.execute('ROLLBACK')
                raise ValueError('Convidado não existe')
            if row['item_escolhido'] is not None:
                conn.execute('ROLLBACK')
                return False
            cur = conn.execute(
                "UPDATE itens SET disponivel = 0 WHERE id = ? AND disponivel = 1",
                (item_id,)
            )
            if cur.rowcount == 0:
                conn.execute('ROLLBACK')
                return False
            conn.execute(
                "UPDATE convidados SET item_escolhido = ? WHERE id = ? AND item_escolhido IS NULL",
                (item_id, convidado_id)
            )
            conn.execute('COMMIT')
            return True
        except Exception:
            try:
                conn.execute('ROLLBACK')
            except Exception:
                pass
            raise

def liberar_item(convidado_id: int) -> bool:
    """Remove a escolha de um convidado e libera o item correspondente.
    Retorna True se liberou, False se convidado não tinha item ou não existe."""
    with get_conn() as conn:
        try:
            conn.execute('BEGIN IMMEDIATE')
            cur = conn.execute(
                'SELECT item_escolhido FROM convidados WHERE id = ?', (convidado_id,)
            )
            row = cur.fetchone()
            if row is None or row['item_escolhido'] is None:
                conn.execute('ROLLBACK')
                return False
            item_id = row['item_escolhido']
            # Limpa o convidado
            conn.execute(
                'UPDATE convidados SET item_escolhido = NULL WHERE id = ? AND item_escolhido = ?',
                (convidado_id, item_id)
            )
            # Libera o item
            conn.execute(
                'UPDATE itens SET disponivel = 1 WHERE id = ?',
                (item_id,)
            )
            conn.execute('COMMIT')
            return True
        except Exception:
            try:
                conn.execute('ROLLBACK')
            except Exception:
                pass
            raise

def remover_convidado(convidado_id: int) -> bool:
    """Remove convidado. Se tiver item escolhido, libera o item. Retorna True se removeu."""
    with get_conn() as conn:
        try:
            conn.execute('BEGIN IMMEDIATE')
            cur = conn.execute('SELECT item_escolhido FROM convidados WHERE id = ?', (convidado_id,))
            row = cur.fetchone()
            if row is None:
                conn.execute('ROLLBACK')
                return False
            item_id = row['item_escolhido']
            if item_id is not None:
                conn.execute('UPDATE itens SET disponivel = 1 WHERE id = ?', (item_id,))
            conn.execute('DELETE FROM convidados WHERE id = ?', (convidado_id,))
            conn.execute('COMMIT')
            return True
        except Exception:
            try:
                conn.execute('ROLLBACK')
            except Exception:
                pass
            raise

def get_stats():
    with get_conn() as conn:
        # Total convidados
        total_convidados = conn.execute('SELECT COUNT(*) FROM convidados').fetchone()[0]
        com_item = conn.execute('SELECT COUNT(*) FROM convidados WHERE item_escolhido IS NOT NULL').fetchone()[0]
        sem_item = total_convidados - com_item
        total_itens = conn.execute('SELECT COUNT(*) FROM itens').fetchone()[0]
        itens_disponiveis = conn.execute('SELECT COUNT(*) FROM itens WHERE disponivel = 1').fetchone()[0]
        itens_escolhidos = total_itens - itens_disponiveis
        perc_itens_escolhidos = (itens_escolhidos / total_itens * 100) if total_itens else 0.0
        return {
            'total_convidados': total_convidados,
            'com_item': com_item,
            'sem_item': sem_item,
            'total_itens': total_itens,
            'itens_escolhidos': itens_escolhidos,
            'itens_disponiveis': itens_disponiveis,
            'perc_itens_escolhidos': round(perc_itens_escolhidos, 2)
        }

def check_nome_exists(nome: str) -> bool:
    with get_conn() as conn:
        cur = conn.execute('SELECT 1 FROM convidados WHERE lower(nome) = lower(?) LIMIT 1', (nome.strip(),))
        return cur.fetchone() is not None
