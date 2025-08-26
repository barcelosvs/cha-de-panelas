export function StepContainer({ title, children, hidden, className = "" }) {
  return (
    <div
      className={`card-base ${className} transition-all duration-500 ease-out px-6 py-6 sm:px-8 sm:py-8
        ${
          hidden
            ? "opacity-0 -translate-y-2 pointer-events-none max-h-0 overflow-hidden mb-0"
            : "opacity-100 translate-y-0 mb-10"
        }
      `}
    >
      {title && (
        <h2 className="text-xl font-semibold mb-5 text-emerald-700 dark:text-emerald-200 tracking-tight">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
