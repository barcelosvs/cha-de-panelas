import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api.js';
import { StepContainer } from '../components/StepContainer.jsx';
import { Loading } from '../components/Loading.jsx';
import { Button } from '../components/Button.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import { useDebounce } from '../hooks/useDebounce.js';

export default function AdminPanel({ onClose }) {
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [convidados, setConvidados] = useState([]);
  const [loadingConvidados, setLoadingConvidados] = useState(false);
  const [busca, setBusca] = useState('');
  const buscaDebounced = useDebounce(busca, 400);
  const [stats, setStats] = useState(null);
  const [liberandoId, setLiberandoId] = useState(null);
  const [confirmLiberarId, setConfirmLiberarId] = useState(null);
  const [removendoId, setRemovendoId] = useState(null);
  const [confirmRemoverId, setConfirmRemoverId] = useState(null);
  const adminRef = useRef(null);
  const sseRef = useRef(null);
  const refreshLockRef = useRef(false);
  const toast = useToast();

  const carregarConvidados = useCallback(async () => {
    if (!adminPassword.trim()) {
      setAdminError('Digite a senha');
      setAdminAuthed(false);
      return;
    }
    setLoadingConvidados(true);
    setAdminError('');
    try {
      const data = await api.getConvidados(adminPassword, buscaDebounced.trim());
      setConvidados(Array.isArray(data) ? data : []);
      setAdminAuthed(true);
      try {
        const st = await api.stats(adminPassword);
        setStats(st);
      } catch (_) {}
    } catch (e) {
      if (e.status === 401) {
        setAdminError('Senha incorreta');
      }
      setAdminAuthed(false);
    } finally {
      setLoadingConvidados(false);
    }
  }, [adminPassword, buscaDebounced]);

  useEffect(() => {
    setAdminAuthed(false);
    setConvidados([]);
    setAdminError('');
  }, [adminPassword]);

  useEffect(() => {
    if (adminRef.current) {
      adminRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  useEffect(() => {
    if (adminAuthed && !sseRef.current) {
      const es = api.stream((evt) => {
        if (!adminAuthed) return;
        if (evt.type === 'itens_update' || evt.type === 'stats_update') {
          if (!refreshLockRef.current) {
            refreshLockRef.current = true;
            setTimeout(() => {
              carregarConvidados();
              refreshLockRef.current = false;
            }, 300);
          }
        }
      });
      sseRef.current = es;
    }
    if (!adminAuthed && sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    return () => {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [adminAuthed, carregarConvidados]);

  useEffect(() => {
    if (adminAuthed) {
      carregarConvidados();
    }
  }, [buscaDebounced, adminAuthed, carregarConvidados]);

  function exportCsv() {
    if (!convidados.length) return;
    const header = ['ID', 'Nome', 'Item', 'Data'];
    const rows = convidados.map((c) => [c.id, c.nome, c.item || '', c.created_at]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'convidados.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function liberar(convidado_id) {
    if (confirmLiberarId !== convidado_id) {
      setConfirmLiberarId(convidado_id);
      setTimeout(() => {
        setConfirmLiberarId((id) => (id === convidado_id ? null : id));
      }, 4000);
      return;
    }
    setLiberandoId(convidado_id);
    try {
      await api.liberar(convidado_id, adminPassword);
      toast.push('Item liberado', { type: 'success' });
      await carregarConvidados();
    } catch (_) {
      toast.push('Erro ao liberar', { type: 'error' });
    } finally {
      setLiberandoId(null);
      setConfirmLiberarId(null);
    }
  }

  async function remover(convidado_id) {
    if (confirmRemoverId !== convidado_id) {
      setConfirmRemoverId(convidado_id);
      setTimeout(() => {
        setConfirmRemoverId((id) => (id === convidado_id ? null : id));
      }, 4000);
      return;
    }
    setRemovendoId(convidado_id);
    try {
      await api.remover(convidado_id, adminPassword);
      toast.push('Convidado removido', { type: 'success' });
      await carregarConvidados();
    } catch (_) {
      toast.push('Erro ao remover', { type: 'error' });
    } finally {
      setRemovendoId(null);
      setConfirmRemoverId(null);
    }
  }

  return (
    <div ref={adminRef} className="mt-4">
      <StepContainer title="Convidados" hidden={false}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            carregarConvidados();
          }}
          className="flex flex-col sm:flex-row gap-3 mb-5"
        >
          <input
            type="password"
            placeholder="Senha admin"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            className="input-base flex-1"
            aria-label="Senha administrador"
          />
          <input
            type="text"
            placeholder="Buscar nome"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="input-base flex-1"
            disabled={!adminAuthed}
            aria-label="Buscar convidado"
          />
          <Button
            variant="danger"
            disabled={!adminPassword.trim() || loadingConvidados}
            loading={loadingConvidados}
          >
            Ver lista
          </Button>
        </form>
        {adminError && (
          <p
            className="text-xs text-rose-600 dark:text-rose-300 mb-3"
            aria-live="assertive"
          >
            {adminError}
          </p>
        )}
        {adminAuthed && (
          <div className="transition-all duration-500 ease-out opacity-100 translate-y-0 space-y-6">
            {stats && (
              <>
                <div className="w-full h-3 bg-emerald-200/60 dark:bg-emerald-800/60 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-400 dark:from-emerald-400 dark:to-green-300 transition-all duration-700"
                    style={{ width: `${stats.perc_itens_escolhidos}%` }}
                    aria-label="Progresso de itens escolhidos"
                    role="progressbar"
                    aria-valuenow={stats.perc_itens_escolhidos}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-emerald-800 dark:text-emerald-100">
                    {stats.perc_itens_escolhidos}%
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard label="Convidados" value={stats.total_convidados} />
                  <StatCard label="Com item" value={stats.com_item} />
                  <StatCard
                    label="Itens escolhidos"
                    value={`${stats.itens_escolhidos}/${stats.total_itens}`}
                  />
                  <StatCard label="% Itens" value={`${stats.perc_itens_escolhidos}%`} />
                </div>
              </>
            )}
            <div className="flex flex-wrap gap-3 text-xs">
              <Button
                onClick={carregarConvidados}
                variant="outline"
                disabled={loadingConvidados}
              >
                Atualizar
              </Button>
              <Button onClick={exportCsv} variant="outline" disabled={!convidados.length}>
                Exportar CSV
              </Button>
              <Button onClick={onClose} variant="outline">
                Fechar
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-emerald-200 dark:border-emerald-800/70">
              {loadingConvidados && (
                <p className="text-sm text-emerald-600 dark:text-emerald-300 p-4">
                  Carregando...
                </p>
              )}
              {!loadingConvidados && (
                <table className="w-full text-sm">
                  <thead className="bg-emerald-100/70 dark:bg-emerald-800/60 text-emerald-800 dark:text-emerald-200">
                    <tr className="text-left">
                      <th className="p-2 font-semibold">ID</th>
                      <th className="p-2 font-semibold">Nome</th>
                      <th className="p-2 font-semibold">Item</th>
                      <th className="p-2 font-semibold">Data</th>
                      <th className="p-2 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="text-emerald-800 dark:text-emerald-100">
                    {convidados.map((c) => (
                      <tr
                        key={c.id}
                        className="odd:bg-white/90 even:bg-emerald-50/80 dark:odd:bg-emerald-900/40 dark:even:bg-emerald-800/30 backdrop-blur-sm"
                      >
                        <td className="p-2 align-top">{c.id}</td>
                        <td className="p-2 align-top">{c.nome}</td>
                        <td className="p-2 align-top">
                          {c.item || (
                            <span className="text-emerald-400 dark:text-emerald-600 italic">
                              (não escolheu)
                            </span>
                          )}
                        </td>
                        <td className="p-2 align-top whitespace-nowrap">
                          {new Date(c.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-2 align-top space-x-2">
                          {c.item ? (
                            <Button
                              onClick={() => liberar(c.id)}
                              variant={confirmLiberarId === c.id ? 'danger' : 'outline'}
                              className="px-2 py-1 text-xs"
                              loading={liberandoId === c.id}
                            >
                              {liberandoId === c.id
                                ? '...'
                                : confirmLiberarId === c.id
                                  ? 'Confirma?'
                                  : 'Liberar'}
                            </Button>
                          ) : (
                            <span className="text-xs text-emerald-500 dark:text-emerald-400">
                              --
                            </span>
                          )}
                          <Button
                            onClick={() => remover(c.id)}
                            variant={confirmRemoverId === c.id ? 'danger' : 'outline'}
                            className="px-2 py-1 text-xs"
                            loading={removendoId === c.id}
                          >
                            {removendoId === c.id
                              ? '...'
                              : confirmRemoverId === c.id
                                ? 'Confirmar'
                                : 'Remover'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {convidados.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-4 text-center text-emerald-500 dark:text-emerald-400"
                        >
                          Nenhum convidado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </StepContainer>
    </div>
  );
}
