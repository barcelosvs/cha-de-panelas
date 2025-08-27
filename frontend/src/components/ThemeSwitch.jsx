import React from 'react';

export function ThemeSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 border dark:border-emerald-600 border-emerald-300 ${
        checked ? 'bg-emerald-600/90 dark:bg-emerald-500' : 'bg-white dark:bg-emerald-800'
      }`}
      aria-label={checked ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
    >
      <span
        className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white dark:bg-emerald-900 shadow flex items-center justify-center transition-all duration-300 ${
          checked ? 'translate-x-8' : 'translate-x-0'
        }`}
      >
        {checked ? (
          // moon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-4 w-4 text-emerald-600 dark:text-emerald-300"
            fill="currentColor"
          >
            <path d="M21 12.79A9 9 0 0 1 11.21 3 7 7 0 1 0 21 12.79z" />
          </svg>
        ) : (
          // sun
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-4 w-4 text-emerald-500"
            fill="currentColor"
          >
            <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z" />
            <path d="M12 2.75a.75.75 0 0 1 .75.75v1a.75.75 0 0 1-1.5 0v-1A.75.75 0 0 1 12 2.75zm0 16.75a.75.75 0 0 1 .75.75v1a.75.75 0 0 1-1.5 0v-1a.75.75 0 0 1 .75-.75zM4.22 4.22a.75.75 0 0 1 1.06 0l.7.7a.75.75 0 1 1-1.06 1.06l-.7-.7a.75.75 0 0 1 0-1.06zm12.1 12.1a.75.75 0 0 1 1.06 0l.7.7a.75.75 0 1 1-1.06 1.06l-.7-.7a.75.75 0 0 1 0-1.06zM2.75 12a.75.75 0 0 1 .75-.75h1a.75.75 0 0 1 0 1.5h-1A.75.75 0 0 1 2.75 12zm16.75 0a.75.75 0 0 1 .75-.75h1a.75.75 0 0 1 0 1.5h-1a.75.75 0 0 1-.75-.75zM5.28 17.68a.75.75 0 0 1 0-1.06l.7-.7a.75.75 0 0 1 1.06 1.06l-.7.7a.75.75 0 0 1-1.06 0zm12.1-12.1a.75.75 0 0 1 0-1.06l.7-.7a.75.75 0 1 1 1.06 1.06l-.7.7a.75.75 0 0 1-1.06 0z" />
          </svg>
        )}
      </span>
    </button>
  );
}
