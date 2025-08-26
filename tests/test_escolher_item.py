import os
import tempfile
import pytest
import sqlite3

from db import get_conn, init_db, create_convidado, escolher_item, liberar_item

@pytest.fixture(autouse=True)
def _setup_db(monkeypatch):
    # usar DB temporário
    fd, path = tempfile.mkstemp()
    os.close(fd)
    monkeypatch.setenv('DB_PATH', path)
    # Monkeypatch DB_PATH global se necessário
    import db as dbmodule
    dbmodule.DB_PATH = path
    init_db()
    yield
    try:
        os.remove(path)
    except OSError:
        pass

def test_escolher_item_fluxo_basico():
    convidado = create_convidado('Alice')
    # Pega um item disponível
    with get_conn() as conn:
        item_id = conn.execute('SELECT id FROM itens WHERE disponivel=1 LIMIT 1').fetchone()[0]
    ok = escolher_item(convidado, item_id)
    assert ok is True
    # Verifica persistência
    with get_conn() as conn:
        row = conn.execute('SELECT item_escolhido FROM convidados WHERE id=?', (convidado,)).fetchone()
        assert row['item_escolhido'] == item_id
        disp = conn.execute('SELECT disponivel FROM itens WHERE id=?', (item_id,)).fetchone()['disponivel']
        assert disp == 0

def test_escolher_item_conflito():
    c1 = create_convidado('Bob')
    c2 = create_convidado('Carol')
    with get_conn() as conn:
        item_id = conn.execute('SELECT id FROM itens WHERE disponivel=1 LIMIT 1').fetchone()[0]
    assert escolher_item(c1, item_id) is True
    assert escolher_item(c2, item_id) is False  # já reservado


def test_nao_pode_escolher_duas_vezes():
    c1 = create_convidado('Diego')
    with get_conn() as conn:
        item_id = conn.execute('SELECT id FROM itens WHERE disponivel=1 LIMIT 1').fetchone()[0]
    assert escolher_item(c1, item_id) is True
    # Tentativa segunda escolha
    with get_conn() as conn:
        outro = conn.execute('SELECT id FROM itens WHERE disponivel=1 AND id!=? LIMIT 1', (item_id,)).fetchone()[0]
    assert escolher_item(c1, outro) is False


def test_liberar_e_reescolher():
    c1 = create_convidado('Eva')
    with get_conn() as conn:
        item_id = conn.execute('SELECT id FROM itens WHERE disponivel=1 LIMIT 1').fetchone()[0]
    assert escolher_item(c1, item_id) is True
    assert liberar_item(c1) is True
    # Item deve voltar a ficar disponível
    with get_conn() as conn:
        disp = conn.execute('SELECT disponivel FROM itens WHERE id=?', (item_id,)).fetchone()['disponivel']
        assert disp == 1
    # Pode escolher de novo
    assert escolher_item(c1, item_id) is True
