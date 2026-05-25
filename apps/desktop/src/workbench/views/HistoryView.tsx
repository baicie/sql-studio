export function HistoryView() {
  return (
    <section className="flex h-full flex-col">
      <header className="flex h-9 items-center border-b px-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          History
        </span>
      </header>

      <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
        Query history will be here.
      </div>
    </section>
  );
}
