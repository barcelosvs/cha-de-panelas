const API = import.meta.env.VITE_API_URL || "/api";

async function fetchJSON(path, options = {}) {
  const r = await fetch(API + path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const txt = await r.text();
  let data;
  try {
    data = txt ? JSON.parse(txt) : {};
  } catch {
    data = { raw: txt };
  }
  if (!r.ok) throw { status: r.status, data };
  return data;
}

export const api = {
  getItens: () => fetchJSON("/itens"),
  getConvidados: (adminPassword, q) =>
    fetchJSON(`/convidados${q ? `?q=${encodeURIComponent(q)}` : ""}`, {
      headers: { "X-Admin-Password": adminPassword || "" },
    }),
  rsvp: (nome, apelido = "") =>
    fetchJSON("/rsvp", {
      method: "POST",
      body: JSON.stringify({ nome, apelido }),
    }),
  escolher: (convidado_id, item_id) =>
    fetchJSON("/escolha", {
      method: "POST",
      body: JSON.stringify({ convidado_id, item_id }),
    }),
  liberar: (convidado_id, adminPassword) =>
    fetchJSON("/admin/liberar", {
      method: "POST",
      body: JSON.stringify({ convidado_id }),
      headers: { "X-Admin-Password": adminPassword || "" },
    }),
  remover: (convidado_id, adminPassword) =>
    fetchJSON("/admin/remover", {
      method: "POST",
      body: JSON.stringify({ convidado_id }),
      headers: { "X-Admin-Password": adminPassword || "" },
    }),
  stats: (adminPassword) =>
    fetchJSON("/admin/stats", {
      headers: { "X-Admin-Password": adminPassword || "" },
    }),
  stream: (onMessage) => {
    const url = API.replace(/\/$/, "") + "/stream";
    const es = new EventSource(url);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        onMessage && onMessage(data);
      } catch (_) {}
    };
    return es;
  },
};
