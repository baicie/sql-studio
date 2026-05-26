import { type SupportedLanguage, languageOptions } from '@sqlgui/i18n';
import { useAppTranslation } from '@/i18n';
import { languageService } from '@/i18n/languageService';
import { useLanguageStore } from '@/i18n/languageStore';
import { useWorkbenchStore } from '../store/workbenchStore';

export function SettingsView() {
  const { t } = useAppTranslation('settings');

  const theme = useWorkbenchStore((state) => state.theme);
  const setTheme = useWorkbenchStore((state) => state.setTheme);
  const language = useLanguageStore((state) => state.language);

  return (
    <section className="flex h-full flex-col">
      <header className="flex h-9 items-center border-b px-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('title')}
        </span>
      </header>

      <div className="space-y-3 p-3">
        <div>
          <div className="text-sm font-medium">{t('appearance.theme')}</div>
          <select
            className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
            value={theme}
            onChange={(event) => {
              setTheme(event.target.value as 'light' | 'dark' | 'system');
            }}
          >
            <option value="system">{t('appearance.system')}</option>
            <option value="light">{t('appearance.light')}</option>
            <option value="dark">{t('appearance.dark')}</option>
          </select>
        </div>

        <div>
          <div className="text-sm font-medium">{t('language.title')}</div>
          <div className="text-xs text-muted-foreground">{t('language.description')}</div>
          <select
            className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
            value={language}
            onChange={(event) => {
              languageService.setLanguage(event.target.value as SupportedLanguage);
            }}
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.nativeLabel}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
