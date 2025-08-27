import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../lib/api.js';

export function useSSEChannel({ enabled, onEvent, maxDelay = 8000 }) {
  const esRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const backoffRef = useRef(500);
  const manualCloseRef = useRef(false);

  const cleanup = useCallback(() => {
    if (esRef.current) {
      manualCloseRef.current = true;
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      setStatus('idle');
      return;
    }
    if (esRef.current) return; // já conectado
    manualCloseRef.current = false;
    setStatus('connecting');
    const es = api.stream((evt) => {
      if (evt && evt.type === 'hello') {
        backoffRef.current = 500; // reset backoff
        setStatus('connected');
      }
      onEvent && onEvent(evt);
    });
    es.onerror = () => {
      setStatus('error');
      es.close();
      esRef.current = null;
      if (!manualCloseRef.current) {
        const delay = backoffRef.current;
        backoffRef.current = Math.min(backoffRef.current * 2, maxDelay);
        setTimeout(() => {
          if (enabled) {
            // força nova conexão
            backoffRef.current = delay * 2; // preserve growth
            setStatus('reconnecting');
            // re-run effect (esRef is null)
          }
        }, delay);
      }
    };
    esRef.current = es;
    return () => {
      cleanup();
    };
  }, [enabled, onEvent, cleanup, maxDelay]);

  return { status };
}
