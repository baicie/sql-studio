export interface PluginLogItem {
  id: string;
  extensionId: string;
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  message: string;
  args: unknown[];
  createdAt: number;
}

type Listener = () => void;

class PluginLogService {
  private logs: PluginLogItem[] = [];
  private listeners = new Set<Listener>();

  log(extensionId: string, level: PluginLogItem['level'], message: string, args: unknown[] = []) {
    this.logs.push({
      id: crypto.randomUUID(),
      extensionId,
      level,
      message,
      args,
      createdAt: Date.now(),
    });

    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

    this.emit();
  }

  trace(extensionId: string, message: string, ...args: unknown[]) {
    this.log(extensionId, 'trace', message, args);
  }

  debug(extensionId: string, message: string, ...args: unknown[]) {
    this.log(extensionId, 'debug', message, args);
  }

  info(extensionId: string, message: string, ...args: unknown[]) {
    this.log(extensionId, 'info', message, args);
  }

  warn(extensionId: string, message: string, ...args: unknown[]) {
    this.log(extensionId, 'warn', message, args);
  }

  error(extensionId: string, message: string, ...args: unknown[]) {
    this.log(extensionId, 'error', message, args);
  }

  getLogs(extensionId?: string) {
    if (!extensionId) return this.logs;

    return this.logs.filter((item) => item.extensionId === extensionId);
  }

  clear(extensionId?: string) {
    if (!extensionId) {
      this.logs = [];
    } else {
      this.logs = this.logs.filter((item) => item.extensionId !== extensionId);
    }

    this.emit();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);

    return {
      dispose: () => this.listeners.delete(listener),
    };
  }

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const pluginLogService = new PluginLogService();
