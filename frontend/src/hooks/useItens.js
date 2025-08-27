import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

export function useItens({ ativo, autoRefresh = true, interval = 20000 }) {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const timerRef = useRef(null);

  const carregar = useCallback(async () => {
    if (!ativo) return;
    setLoading(true);
    setMsg('');
    try {
      const data = await api.getItens();
      setItens(Array.isArray(data) ? data : []);
      if (!data.length) setMsg('Nenhum item disponível.');
    } catch (e) {
      setMsg('Erro ao carregar itens.');
    } finally {
      setLoading(false);
    }
  }, [ativo]);

  useEffect(() => {
    if (ativo) carregar();
  }, [ativo, carregar]);

  useEffect(() => {
    if (!ativo || !autoRefresh) return;
    timerRef.current = setInterval(() => carregar(), interval);
    return () => clearInterval(timerRef.current);
  }, [ativo, autoRefresh, interval, carregar]);

  return { itens, loading, msg, carregar, setMsg };
}
