export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogItem {
  id: string;
  level: LogLevel;
  scope: string;
  message: string;
  timestamp: number;
  data?: unknown;
}
