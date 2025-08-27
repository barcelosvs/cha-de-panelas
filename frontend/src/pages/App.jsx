import React, { useEffect, useState, useRef, Suspense, lazy, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { api } from '../lib/api.js';
import { ItItem } from '../components/ItItem.jsx';
import { Loading } from '../components/Loading.jsx';
import { StepContainer } from '../components/StepContainer.jsx';
import { Button } from '../components/Button.jsx';
import { ToastProvider, useToast } from '../components/ToastProvider.jsx';
import { ThemeSwitch } from '../components/ThemeSwitch.jsx';
import { useItens } from '../hooks/useItens.js';
import { useSSEChannel } from '../hooks/useSSEChannel.js';

const AdminPanel = lazy(() => import('./AdminPanel.jsx'));

function InnerApp() {
  const [convidadoId, setConvidadoId] = useLocalStorage('convidado_id', null);
  const [rsvpNome, setRsvpNome] = useState('');
  const [rsvpMsg, setRsvpMsg] = useState('');
  const [jaEscolheu, setJaEscolheu] = useState(false);
  const {
    itens,
    loading,
    msg: itensMsg,
    carregar: carregarItens,
    setMsg: setItensMsg,
    stats,
  } = useItens({ ativo: !!convidadoId && !jaEscolheu });
  const [adminView, setAdminView] = useState(false);
  const adminRef = useRef(null);
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : false;
  });
  const [honeypot, setHoneypot] = useState('');
  const toast = useToast();

  const sse = useSSEChannel({
    enabled: true,
    onEvent: (evt) => {
      if (evt.type === 'itens_update' && convidadoId && !jaEscolheu) {
        carregarItens();
      }
    },
  });

  useEffect(() => {
    if (convidadoId) carregarItens();
  }, [convidadoId, carregarItens]);

  useEffect(() => {
    if (adminView && adminRef.current) {
      adminRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [adminView]);

  useEffect(() => {
    const root = document.documentElement; // <html>
    if (dark) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  async function handleRsvp(ev) {
    ev.preventDefault();
    if (!rsvpNome.trim()) return;
    setRsvpMsg('Enviando...');
    try {
      const res = await api.rsvp(rsvpNome.trim(), honeypot);
      setConvidadoId(res.convidado_id);
      setRsvpMsg('Presença confirmada!');
      toast.push('Presença confirmada', { type: 'success' });
    } catch (e) {
      const msg = e?.data?.error || 'Erro.';
      setRsvpMsg(msg);
      toast.push(msg, { type: 'error' });
    }
  }

  async function escolherItem(item) {
    if (!convidadoId) return;
    setItensMsg('Enviando...');
    try {
      await api.escolher(Number(convidadoId), item.id);
      setJaEscolheu(true);
      setItensMsg('Escolha registrada!');
    } catch (e) {
      if (e.status === 409) {
        setItensMsg('Item já escolhido por outra pessoa. Atualizando lista...');
        await carregarItens();
      } else {
        setItensMsg('Erro ao reservar. Tente novamente.');
      }
    }
  }

  function resetConvidado() {
    setConvidadoId(null);
    setJaEscolheu(false);
    setRsvpNome('');
    setRsvpMsg('');
    setItensMsg('');
  }

  const showStepRsvp = !convidadoId;
  const showStepItens = !!convidadoId && !jaEscolheu;
  const showSucesso = jaEscolheu;
  const restante = itens.length;
  const progresso =
    stats && stats.total_itens
      ? Math.round((stats.itens_escolhidos / stats.total_itens) * 100)
      : null;

  return (
    <div>
      <div className="max-w-5xl mx-auto py-12 container-app">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-500 dark:from-emerald-300 dark:to-green-200 bg-clip-text text-transparent tracking-tight">
              Chá de Panelas
            </h1>
            <p className="text-sm text-emerald-700/70 dark:text-emerald-300/70 mt-1">
              Confirme presença e escolha um item.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {convidadoId && (
              <Button
                onClick={resetConvidado}
                variant="outline"
                className="py-1 px-3 text-xs"
                title="Voltar para adicionar outro nome"
              >
                Novo nome
              </Button>
            )}
            <ThemeSwitch checked={dark} onChange={(val) => setDark(val)} />
            <Button
              onClick={() => setAdminView((v) => !v)}
              variant="outline"
              className="text-xs"
            >
              {adminView ? 'Fechar admin' : 'Ver convidados'}
            </Button>
          </div>
        </div>

        <StepContainer hidden={!showStepRsvp} title="Confirme sua presença">
          <form onSubmit={handleRsvp} className="space-y-4">
            <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-200">
              Nome
              <input
                value={rsvpNome}
                onChange={(e) => setRsvpNome(e.target.value)}
                placeholder="Seu nome"
                className="input-base mt-1"
                required
              />
            </label>
            <input
              type="text"
              name="apelido"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              style={{
                position: 'absolute',
                left: '-9999px',
                opacity: 0,
                height: 0,
                width: 0,
              }}
              aria-hidden="true"
            />
            <Button
              className="w-full"
              disabled={!rsvpNome.trim()}
              loading={rsvpMsg === 'Enviando...'}
            >
              Confirmar
            </Button>
          </form>
          <p
            className="text-sm mt-2 text-emerald-600 dark:text-emerald-300"
            aria-live="polite"
          >
            {rsvpMsg}
          </p>
        </StepContainer>

        <StepContainer hidden={!showStepItens} title="Escolha o que vai levar">
          <p className="text-xs text-emerald-600/80 dark:text-emerald-300/70 mb-3 font-medium">
            Itens restantes: {restante}
          </p>
          <div className="grid-itens">
            {loading && <Loading />}
            {!loading &&
              itens.map((item) => (
                <ItItem key={item.id} item={item} onChoose={escolherItem} />
              ))}
            {!loading && !itens.length && <Loading>Sem itens disponíveis.</Loading>}
          </div>
          <p
            className="mt-6 text-sm text-emerald-700 dark:text-emerald-200"
            aria-live="polite"
          >
            {itensMsg}
          </p>
          <Button onClick={carregarItens} variant="ghost" className="mt-4 text-xs">
            Atualizar lista
          </Button>
        </StepContainer>

        <StepContainer hidden={!showSucesso}>
          <h2 className="text-2xl font-semibold text-rose-600 mb-2 text-center">
            Obrigado!
          </h2>
          {progresso !== null && (
            <div className="w-full h-2 bg-emerald-200/60 dark:bg-emerald-800/60 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-emerald-500 dark:bg-emerald-400 transition-all"
                style={{ width: `${progresso}%` }}
              />
            </div>
          )}
          <p className="mb-4 text-center">Sua escolha foi registrada.</p>
          <div className="text-center">
            <Button onClick={() => carregarItens()} variant="ghost" className="text-sm">
              Ver itens restantes (somente visualizar)
            </Button>
          </div>
          {showSucesso && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Itens restantes:</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {loading && <Loading />}
                {!loading &&
                  itens.map((item) => (
                    <ItItem key={item.id} item={item} onChoose={() => {}} />
                  ))}
                {!loading && !itens.length && <Loading>Sem itens disponíveis.</Loading>}
              </div>
            </div>
          )}
        </StepContainer>

        {adminView && (
          <div ref={adminRef}>
            <Suspense
              fallback={
                <div className="text-sm text-emerald-600">Carregando admin...</div>
              }
            >
              <AdminPanel onClose={() => setAdminView(false)} />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <InnerApp />
    </ToastProvider>
  );
}
