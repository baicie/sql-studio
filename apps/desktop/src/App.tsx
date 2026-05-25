import { useEffect, useState } from 'react';

import { bootstrapServices } from './services/bootstrap';
import { callNative } from './services/native/invoke';
import { Workbench } from './workbench/Workbench';

interface HealthCheckResponse {
  appName: string;
  rustCoreReady: boolean;
}

let bootstrapped = false;

export default function App() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);

  useEffect(() => {
    if (!bootstrapped) {
      bootstrapServices();
      bootstrapped = true;
    }

    callNative<HealthCheckResponse>('system_health_check').then(setHealth).catch(console.error);
  }, []);

  return <Workbench health={health} />;
}
