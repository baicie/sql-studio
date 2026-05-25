interface StatusBarProps {
  health: {
    appName: string;
    rustCoreReady: boolean;
  } | null;
}

export function StatusBar({ health }: StatusBarProps) {
  return (
    <footer className="flex items-center justify-between border-t bg-muted px-3 text-xs text-muted-foreground">
      <span>SQL GUI</span>
      <span>Rust Core: {health?.rustCoreReady ? 'Ready' : 'Checking...'}</span>
    </footer>
  );
}
