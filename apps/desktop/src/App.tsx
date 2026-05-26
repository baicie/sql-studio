import { useEffect, useState } from 'react';

import { bootstrapApp } from './app/bootstrap';
import { callNative } from './services/native/invoke';
import { Workbench } from './workbench/Workbench';
import { PermissionGrantDialog } from './plugins/permissions/components/PermissionGrantDialog';
import { DangerousSqlConfirmDialog } from './plugins/permissions/components/DangerousSqlConfirmDialog';

interface HealthCheckResponse {
  appName: string;
  rustCoreReady: boolean;
}

export default function App() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);

  useEffect(() => {
    bootstrapApp();

    callNative<HealthCheckResponse>('system_health_check').then(setHealth).catch(console.error);
  }, []);

  return (
    <>
      <Workbench health={health} />
      <PermissionGrantDialog />
      <DangerousSqlConfirmDialog />
    </>
  );
}
