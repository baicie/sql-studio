import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sqlgui/ui';
import { useAppTranslation } from '@/i18n';
import { connectionService } from '@/services/connection/connection-service';

interface ConnectionSelectorProps {
  value?: string;
  onChange: (connectionId?: string) => void;
}

export function ConnectionSelector(props: ConnectionSelectorProps) {
  const { t } = useAppTranslation('connection');

  const { value, onChange } = props;

  const profiles = connectionService.getProfiles();

  return (
    <Select value={value ?? ''} onValueChange={(v) => onChange(v || undefined)}>
      <SelectTrigger className="h-7 w-auto min-w-[120px] text-xs">
        <SelectValue placeholder={t('fields.name')} />
      </SelectTrigger>
      <SelectContent>
        {profiles.map((profile) => (
          <SelectItem key={profile.id} value={profile.id}>
            {profile.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
