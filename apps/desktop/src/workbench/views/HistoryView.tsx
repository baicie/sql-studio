import { useAppTranslation } from '@/i18n';

export function HistoryView() {
  const { t } = useAppTranslation('workbench');

  return (
    <section className="flex h-full flex-col">
      <header className="flex h-9 items-center border-b px-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('panel.history')}
        </span>
      </header>

      <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
        {t('commandPalette.noCommands')}
      </div>
    </section>
  );
}
