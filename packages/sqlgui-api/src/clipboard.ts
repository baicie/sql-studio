export interface ClipboardApi {
  readText(): Promise<string>;
  writeText(text: string): Promise<void>;
}
