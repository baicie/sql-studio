import { useWorkbenchStore } from '../store/workbenchStore';

export function SettingsView() {
  const theme = useWorkbenchStore((state) => state.theme);
  const setTheme = useWorkbenchStore((state) => state.setTheme);

  return (
    <section className="flex h-full flex-col">
      <header className="flex h-9 items-center border-b px-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Settings
        </span>
      </header>

      <div className="space-y-3 p-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">Theme</span>

          <select
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
            value={theme}
            onChange={(event) => {
              setTheme(event.target.value as 'light' | 'dark' | 'system');
            }}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>
    </section>
  );
}
