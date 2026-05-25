import { useEffect, useState } from 'react';

import { bootstrapApp } from './app/bootstrap';
import { callNative } from './services/native/invoke';
import { Workbench } from './workbench/Workbench';

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

  return <Workbench health={health} />;
}
