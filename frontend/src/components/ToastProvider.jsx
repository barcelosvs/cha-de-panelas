import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastCtx = createContext(null);
let idc = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((msg, opts = {}) => {
    const id = ++idc;
    const t = { id, msg, type: opts.type || 'info', ttl: opts.ttl || 4000 };
    setToasts((arr) => [...arr, t]);
    setTimeout(() => {
      setToasts((arr) => arr.filter((x) => x.id !== id));
    }, t.ttl);
  }, []);

  const api = { push };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed z-50 top-4 right-4 flex flex-col gap-3 w-72">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`card-base px-4 py-3 shadow-md border-l-4 text-sm animate-fade-in ${
              t.type === 'success'
                ? 'border-emerald-500'
                : t.type === 'error'
                  ? 'border-rose-500'
                  : 'border-emerald-300'
            }`}
            role="alert"
            aria-live="assertive"
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
