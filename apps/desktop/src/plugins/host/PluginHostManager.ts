import { PluginHost } from './PluginHost';
import { activationRegistry } from '@/services/extension/activation-registry';

class PluginHostManager {
  private hosts = new Map<string, PluginHost>();

  constructor(
    private readonly options: {
      appVersion: string;
    },
  ) {}

  getHost(extensionId: string) {
    return this.hosts.get(extensionId);
  }

  async activateExtension(extensionId: string) {
    const extension = activationRegistry.getExtensionById(extensionId);

    if (!extension) {
      throw new Error(`Extension not found: ${extensionId}`);
    }

    if (!extension.enabled) {
      throw new Error(`Extension is not enabled: ${extensionId}`);
    }

    let host = this.hosts.get(extensionId);

    if (!host) {
      host = new PluginHost(extension, {
        appVersion: this.options.appVersion,
      });
      this.hosts.set(extensionId, host);
    }

    await host.activate();

    return host;
  }

  async activateByEvent(event: string) {
    const extensionIds = activationRegistry.getExtensionsForEvent(event);

    await Promise.all(
      extensionIds.map((extensionId) =>
        this.activateExtension(extensionId).catch((error) => {
          console.error(`[PluginHostManager] activate ${extensionId} by ${event} failed`, error);
        }),
      ),
    );
  }

  async invokeCommand(extensionId: string, command: string, args: unknown[]) {
    await this.activateByEvent(`onCommand:${command}`);

    const host = await this.activateExtension(extensionId);

    return host.invokeCommand(command, args);
  }

  async deactivateExtension(extensionId: string) {
    const host = this.hosts.get(extensionId);
    if (!host) return;

    await host.deactivate();
    this.hosts.delete(extensionId);
  }

  async reloadExtension(extensionId: string) {
    await this.deactivateExtension(extensionId);
    await this.activateExtension(extensionId);
  }

  async reloadAll() {
    const ids = Array.from(this.hosts.keys());

    for (const id of ids) {
      await this.deactivateExtension(id);
    }

    this.hosts.clear();
  }

  terminateAll() {
    for (const host of this.hosts.values()) {
      host.terminate();
    }

    this.hosts.clear();
  }
}

export const pluginHostManager = new PluginHostManager({
  appVersion: '0.1.0',
});
