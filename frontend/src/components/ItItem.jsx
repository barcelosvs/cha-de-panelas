/* Representa um item disponível */
export function ItItem({ item, disabled, onChoose, selected }) {
  return (
    <button
      disabled={disabled}
      onClick={() => onChoose(item)}
      className={`border rounded-md px-4 py-2.5 text-left text-sm flex justify-between items-center gap-2 transition
        ${
          selected
            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-800 ring-1 ring-emerald-400/50 dark:ring-emerald-500/40"
            : "hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-800/40 border-emerald-200 dark:border-emerald-700"
        }
        disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <span className="truncate font-medium text-emerald-800 dark:text-emerald-100">
        {item.nome_item}
      </span>
      {selected && (
        <span className="text-emerald-600 dark:text-emerald-300 text-xs font-semibold">
          ✔
        </span>
      )}
    </button>
  );
}
