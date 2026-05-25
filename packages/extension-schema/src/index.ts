export interface ExtensionManifest {
  name: string;
  displayName?: string;
  publisher: string;
  version: string;
  main: string;
  activationEvents?: string[];
  permissions?: string[];
  contributes?: {
    commands?: Array<{
      command: string;
      title: string;
      category?: string;
    }>;
    menus?: Record<
      string,
      Array<{
        command: string;
        when?: string;
        group?: string;
      }>
    >;
  };
}
