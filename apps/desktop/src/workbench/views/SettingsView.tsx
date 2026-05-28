import { type SupportedLanguage, languageOptions } from '@sqlgui/i18n';
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sqlgui/ui';
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
          <Label className="text-sm font-medium">{t('appearance.theme')}</Label>
          <Select
            value={theme}
            onValueChange={(value) => {
              setTheme(value as 'light' | 'dark' | 'system');
            }}
          >
            <SelectTrigger className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">{t('appearance.system')}</SelectItem>
              <SelectItem value="light">{t('appearance.light')}</SelectItem>
              <SelectItem value="dark">{t('appearance.dark')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium">{t('language.title')}</Label>
          <div className="text-xs text-muted-foreground">{t('language.description')}</div>
          <Select
            value={language}
            onValueChange={(value) => {
              languageService.setLanguage(value as SupportedLanguage);
            }}
          >
            <SelectTrigger className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languageOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.nativeLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
