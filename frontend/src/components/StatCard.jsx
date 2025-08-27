import React from 'react';

export function StatCard({ label, value }) {
  return (
    <div className="card-base p-4" role="status" aria-live="polite">
      <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-300 font-medium">
        {label}
      </p>
      <p className="text-2xl font-semibold mt-1 tabular-nums">{value}</p>
    </div>
  );
}
