import { useAppTranslation } from '@/i18n';

export function ProblemsPanel() {
  const { t } = useAppTranslation('workbench');

  return <div className="p-3 text-sm text-muted-foreground">{t('panel.problems')}</div>;
}
