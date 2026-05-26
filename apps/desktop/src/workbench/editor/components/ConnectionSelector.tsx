import { connectionService } from '@/services/connection/connection-service';

interface ConnectionSelectorProps {
  value?: string;
  onChange: (connectionId?: string) => void;
}

export function ConnectionSelector(props: ConnectionSelectorProps) {
  const { value, onChange } = props;

  const profiles = connectionService.getProfiles();

  return (
    <select
      className="h-7 rounded-md border bg-background px-2 text-xs"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
    >
      <option value="">Select connection</option>
      {profiles.map((profile) => (
        <option key={profile.id} value={profile.id}>
          {profile.name}
        </option>
      ))}
    </select>
  );
}
