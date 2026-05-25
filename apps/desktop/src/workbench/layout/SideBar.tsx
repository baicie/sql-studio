export function SideBar() {
  return (
    <aside className="border-r bg-muted/20">
      <div className="border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Connections
      </div>

      <div className="p-3 text-sm text-muted-foreground">No connections yet.</div>
    </aside>
  );
}
