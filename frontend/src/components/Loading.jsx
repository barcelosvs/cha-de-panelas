export function Loading({ children = "Carregando..." }) {
  return (
    <div className="col-span-full text-center text-sm text-slate-500">
      {children}
    </div>
  );
}
