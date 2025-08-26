import React, { useEffect, useState, useCallback, useRef } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { api } from "../lib/api.js";
import { ItItem } from "../components/ItItem.jsx";
import { Loading } from "../components/Loading.jsx";
import { StepContainer } from "../components/StepContainer.jsx";

export default function App() {
  const [convidadoId, setConvidadoId] = useLocalStorage("convidado_id", null);
  const [itens, setItens] = useState([]);
  const [loadingItens, setLoadingItens] = useState(false);
  const [rsvpNome, setRsvpNome] = useState("");
  const [rsvpMsg, setRsvpMsg] = useState("");
  const [itensMsg, setItensMsg] = useState("");
  const [jaEscolheu, setJaEscolheu] = useState(false);
  const [polling, setPolling] = useState(null);
  const [adminView, setAdminView] = useState(false);
  const [convidados, setConvidados] = useState([]);
  const [loadingConvidados, setLoadingConvidados] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [itemEscolhidoId, setItemEscolhidoId] = useState(null);
  const adminRef = useRef(null);
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : false;
  });
  const [busca, setBusca] = useState("");
  const [stats, setStats] = useState(null);
  const [liberandoId, setLiberandoId] = useState(null);
  const [confirmLiberarId, setConfirmLiberarId] = useState(null);
  const [removendoId, setRemovendoId] = useState(null);
  const [confirmRemoverId, setConfirmRemoverId] = useState(null);
  const [honeypot, setHoneypot] = useState("");

  const carregarItens = useCallback(async () => {
    if (jaEscolheu) return; // não precisa atualizar
    setLoadingItens(true);
    setItensMsg("");
    try {
      const data = await api.getItens();
      setItens(Array.isArray(data) ? data : []);
      if (!data.length) setItensMsg("Nenhum item disponível.");
    } catch (e) {
      setItensMsg("Erro ao carregar itens.");
    } finally {
      setLoadingItens(false);
    }
  }, [jaEscolheu]);

  const carregarConvidados = useCallback(async () => {
    if (!adminPassword.trim()) {
      setAdminError("Digite a senha");
      setAdminAuthed(false);
      return;
    }
    setLoadingConvidados(true);
    setAdminError("");
    try {
      const data = await api.getConvidados(adminPassword, busca.trim());
      setConvidados(Array.isArray(data) ? data : []);
      setAdminAuthed(true);
      // carrega stats em paralelo
      try {
        const st = await api.stats(adminPassword);
        setStats(st);
      } catch (_) {}
    } catch (e) {
      if (e.status === 401) {
        setAdminError("Senha incorreta");
      }
      setAdminAuthed(false);
    } finally {
      setLoadingConvidados(false);
    }
  }, [adminPassword, busca]);

  useEffect(() => {
    if (convidadoId) carregarItens();
  }, [convidadoId, carregarItens]);

  useEffect(() => {
    if (!convidadoId || jaEscolheu) return;
    const id = setInterval(() => carregarItens(), 20000);
    setPolling(id);
    return () => clearInterval(id);
  }, [convidadoId, jaEscolheu, carregarItens]);

  useEffect(() => {
    if (adminView) carregarConvidados();
  }, [adminView, carregarConvidados]);

  useEffect(() => {
    setAdminAuthed(false);
    setConvidados([]);
    setAdminError("");
  }, [adminPassword]);

  useEffect(() => {
    if (adminView && adminRef.current) {
      adminRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [adminView]);

  useEffect(() => {
    const root = document.documentElement; // <html>
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  async function handleRsvp(ev) {
    ev.preventDefault();
    if (!rsvpNome.trim() || confirmando) return;
    setConfirmando(true);
    setRsvpMsg("Enviando...");
    try {
      const res = await api.rsvp(rsvpNome.trim(), honeypot);
      setConvidadoId(res.convidado_id);
      setRsvpMsg("Presença confirmada!");
    } catch (e) {
      setRsvpMsg(e?.data?.error || "Erro.");
    } finally {
      setConfirmando(false);
    }
  }

  async function escolherItem(item) {
    if (!convidadoId || itemEscolhidoId) return;
    setItensMsg("Enviando...");
    setItemEscolhidoId(item.id);
    try {
      await api.escolher(Number(convidadoId), item.id);
      setJaEscolheu(true);
      setItensMsg("Escolha registrada!");
      if (polling) clearInterval(polling);
    } catch (e) {
      if (e.status === 409) {
        setItensMsg("Item já escolhido por outra pessoa. Atualizando lista...");
        setItemEscolhidoId(null);
        await carregarItens();
      } else {
        setItensMsg("Erro ao reservar. Tente novamente.");
        setItemEscolhidoId(null);
      }
    }
  }

  function exportCsv() {
    if (!convidados.length) return;
    const header = ["ID", "Nome", "Item", "Data"];
    const rows = convidados.map((c) => [
      c.id,
      c.nome,
      c.item || "",
      c.created_at,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "convidados.csv";
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
      await carregarConvidados();
    } catch (_) {
      // noop ou mostrar toast simples
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
      await carregarConvidados();
    } catch (_) {
    } finally {
      setRemovendoId(null);
      setConfirmRemoverId(null);
    }
  }

  const showStepRsvp = !convidadoId;
  const showStepItens = !!convidadoId && !jaEscolheu;
  const showSucesso = jaEscolheu;
  const restante = itens.length;

  function resetConvidado() {
    if (polling) clearInterval(polling);
    setConvidadoId(null);
    setJaEscolheu(false);
    setItemEscolhidoId(null);
    setRsvpNome("");
    setRsvpMsg("");
    setItensMsg("");
  }

  return (
    <div>
      <div className="max-w-6xl mx-auto py-14 container-app">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-500 dark:from-emerald-300 dark:to-green-200 bg-clip-text text-transparent tracking-tight">
            Chá de Panelas
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            {convidadoId && (
              <button
                onClick={resetConvidado}
                className="btn-outline py-1 px-3 text-xs"
                title="Voltar para adicionar outro nome"
              >
                Novo nome
              </button>
            )}
            <button
              onClick={() => setDark((d) => !d)}
              className="btn-outline py-1 px-3 text-xs"
            >
              {dark ? "Light" : "Dark"}
            </button>
            <button
              onClick={() => setAdminView((v) => !v)}
              className="text-xs underline text-emerald-700 dark:text-emerald-300"
            >
              {adminView ? "Fechar admin" : "Ver convidados"}
            </button>
          </div>
        </div>

        <StepContainer hidden={!showStepRsvp} title="Confirme sua presença">
          <form onSubmit={handleRsvp} className="space-y-4">
            <input
              value={rsvpNome}
              onChange={(e) => setRsvpNome(e.target.value)}
              placeholder="Seu nome"
              className="input-base"
              required
            />
            <input
              type="text"
              name="apelido"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              style={{
                position: "absolute",
                left: "-9999px",
                opacity: 0,
                height: 0,
                width: 0,
              }}
              aria-hidden="true"
            />
            <button
              className="btn-primary w-full gap-2"
              disabled={!rsvpNome.trim() || confirmando}
            >
              {confirmando && (
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              )}
              {confirmando ? "Enviando..." : "Confirmar"}
            </button>
          </form>
          <p className="text-sm mt-2 text-emerald-600 dark:text-emerald-300">
            {rsvpMsg}
          </p>
        </StepContainer>

        <StepContainer hidden={!showStepItens} title="Escolha o que vai levar">
          <p className="text-xs text-emerald-600/80 dark:text-emerald-300/70 mb-3 font-medium">
            Itens restantes: {restante}
          </p>
          <div className="grid-itens">
            {loadingItens && <Loading />}
            {!loadingItens &&
              itens.map((item) => (
                <ItItem
                  key={item.id}
                  item={item}
                  onChoose={escolherItem}
                  disabled={!!itemEscolhidoId && itemEscolhidoId !== item.id}
                  selected={itemEscolhidoId === item.id}
                />
              ))}
            {!loadingItens && !itens.length && (
              <Loading>Sem itens disponíveis.</Loading>
            )}
          </div>
          <p className="mt-6 text-sm text-emerald-700 dark:text-emerald-200">
            {itensMsg}
          </p>
          <button
            onClick={carregarItens}
            className="mt-4 text-xs text-emerald-700 underline dark:text-emerald-300"
          >
            Atualizar lista
          </button>
        </StepContainer>

        <StepContainer hidden={!showSucesso}>
          <h2 className="text-2xl font-semibold text-rose-600 mb-2 text-center">
            Obrigado!
          </h2>
          <p className="mb-4 text-center">Sua escolha foi registrada.</p>
          <div className="text-center">
            <button
              onClick={() => carregarItens()}
              className="text-sm text-rose-600 underline"
            >
              Ver itens restantes (somente visualizar)
            </button>
          </div>
          {showSucesso && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Itens restantes:</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {loadingItens && <Loading />}
                {!loadingItens &&
                  itens.map((item) => (
                    <ItItem
                      key={item.id}
                      item={item}
                      onChoose={() => {}}
                      disabled={true}
                    />
                  ))}
                {!loadingItens && !itens.length && (
                  <Loading>Sem itens disponíveis.</Loading>
                )}
              </div>
            </div>
          )}
        </StepContainer>

        {adminView && (
          <div ref={adminRef}>
            <StepContainer title="Convidados" hidden={false} className="mt-4">
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
                />
                <input
                  type="text"
                  placeholder="Buscar nome"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="input-base flex-1"
                  disabled={!adminAuthed}
                />
                <button
                  className="btn-danger px-6"
                  disabled={!adminPassword.trim() || loadingConvidados}
                >
                  {loadingConvidados ? "Carregando..." : "Ver lista"}
                </button>
              </form>
              {adminError && (
                <p className="text-xs text-rose-600 dark:text-rose-300 mb-3">
                  {adminError}
                </p>
              )}
              {adminAuthed && (
                <div className="transition-all duration-500 ease-out opacity-100 translate-y-0 space-y-6">
                  {stats && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="card-base p-4">
                        <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                          Convidados
                        </p>
                        <p className="text-2xl font-semibold mt-1">
                          {stats.total_convidados}
                        </p>
                      </div>
                      <div className="card-base p-4">
                        <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                          Com item
                        </p>
                        <p className="text-2xl font-semibold mt-1">
                          {stats.com_item}
                        </p>
                      </div>
                      <div className="card-base p-4">
                        <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                          Itens escolhidos
                        </p>
                        <p className="text-2xl font-semibold mt-1">
                          {stats.itens_escolhidos}/{stats.total_itens}
                        </p>
                      </div>
                      <div className="card-base p-4">
                        <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                          % Itens
                        </p>
                        <p className="text-2xl font-semibold mt-1">
                          {stats.perc_itens_escolhidos}%
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs">
                    <button
                      onClick={carregarConvidados}
                      className="btn-outline px-4 py-1"
                      disabled={loadingConvidados}
                    >
                      Atualizar
                    </button>
                    <button
                      onClick={exportCsv}
                      className="btn-outline px-4 py-1"
                      disabled={!convidados.length}
                    >
                      Exportar CSV
                    </button>
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
                                {new Date(c.created_at).toLocaleString("pt-BR")}
                              </td>
                              <td className="p-2 align-top space-x-2">
                                {c.item ? (
                                  <button
                                    onClick={() => liberar(c.id)}
                                    disabled={liberandoId === c.id}
                                    className={`text-xs font-medium px-2 py-1 rounded border transition-colors ${
                                      confirmLiberarId === c.id
                                        ? "bg-rose-600 text-white border-rose-600 hover:bg-rose-700"
                                        : "border-rose-500 text-rose-600 dark:text-rose-300 hover:bg-rose-50/60 dark:hover:bg-rose-500/20"
                                    }`}
                                  >
                                    {liberandoId === c.id
                                      ? "..."
                                      : confirmLiberarId === c.id
                                      ? "Confirma?"
                                      : "Liberar"}
                                  </button>
                                ) : (
                                  <span className="text-xs text-emerald-500 dark:text-emerald-400">
                                    --
                                  </span>
                                )}
                                <button
                                  onClick={() => remover(c.id)}
                                  disabled={removendoId === c.id}
                                  className={`text-xs font-medium px-2 py-1 rounded border transition-colors ${
                                    confirmRemoverId === c.id
                                      ? "bg-orange-600 text-white border-orange-600 hover:bg-orange-700"
                                      : "border-orange-500 text-orange-600 dark:text-orange-300 hover:bg-orange-50/60 dark:hover:bg-orange-500/20"
                                  }`}
                                >
                                  {removendoId === c.id
                                    ? "..."
                                    : confirmRemoverId === c.id
                                    ? "Confirmar"
                                    : "Remover"}
                                </button>
                              </td>
                            </tr>
                          ))}
                          {convidados.length === 0 && !loadingConvidados && (
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
        )}
      </div>
    </div>
  );
}
