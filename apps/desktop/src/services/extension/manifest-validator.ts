import type { ExtensionPermission, MenuLocation } from '@sqlgui/extension-schema';
import { ALLOWED_MENU_LOCATIONS, ALLOWED_PERMISSIONS } from '@sqlgui/extension-schema';

export interface ManifestValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_ACTIVATION_PREFIXES = ['onCommand:', 'onView:', 'onDbKind:', 'onLanguage:'];

export function validateManifest(manifest: unknown): ManifestValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isObject(manifest)) {
    return {
      valid: false,
      errors: ['Manifest must be an object.'],
      warnings,
    };
  }

  const item = manifest as Record<string, unknown>;

  validateRequiredString(item, 'name', errors);
  validateRequiredString(item, 'publisher', errors);
  validateRequiredString(item, 'version', errors);

  const name = item.name as string | undefined;
  const publisher = item.publisher as string | undefined;

  if (name && !/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    errors.push('name must contain only lowercase letters, numbers and hyphen.');
  }

  if (publisher && !/^[a-z0-9][a-z0-9-]*$/.test(publisher)) {
    errors.push('publisher must contain only lowercase letters, numbers and hyphen.');
  }

  validateActivationEvents(item, errors, warnings);
  validatePermissions(item, errors);
  validateContributes(item, errors, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateRequiredString(item: Record<string, unknown>, key: string, errors: string[]) {
  if (typeof item[key] !== 'string' || !(item[key] as string)) {
    errors.push(`${key} is required.`);
  }
}

function validateActivationEvents(
  manifest: Record<string, unknown>,
  errors: string[],
  warnings: string[],
) {
  const events = (manifest.activationEvents ?? []) as string[];

  for (const event of events) {
    if (event === '*') continue;
    if (event === 'onStartupFinished') continue;

    const hasValidPrefix = VALID_ACTIVATION_PREFIXES.some((prefix) => event.startsWith(prefix));

    if (!hasValidPrefix) {
      errors.push(`Invalid activation event: ${event}`);
    }
  }

  if (!events.length && manifest.main) {
    warnings.push('Extension has main entry but no activationEvents. It may never activate.');
  }
}

function validatePermissions(manifest: Record<string, unknown>, errors: string[]) {
  const permissions = (manifest.permissions ?? []) as string[];

  for (const permission of permissions) {
    if (!ALLOWED_PERMISSIONS.includes(permission as ExtensionPermission)) {
      errors.push(`Invalid permission: ${permission}`);
    }
  }
}

function validateContributes(
  manifest: Record<string, unknown>,
  errors: string[],
  warnings: string[],
) {
  const contributes = manifest.contributes as Record<string, unknown> | undefined;
  if (!contributes) {
    warnings.push('Extension contributes nothing.');
    return;
  }

  const commands = contributes.commands as Array<{ command: string; title?: string }> | undefined;
  const commandIds = new Set<string>(commands?.map((item) => item.command) ?? []);

  for (const command of commands ?? []) {
    if (!command.command.includes('.')) {
      errors.push(`Command "${command.command}" should be namespaced, e.g. "sql.format".`);
    }

    if (!command.title) {
      errors.push(`Command "${command.command}" requires title.`);
    }
  }

  const menus = contributes.menus as Record<string, Array<{ command: string }>> | undefined;
  for (const [location, items] of Object.entries(menus ?? {})) {
    if (!ALLOWED_MENU_LOCATIONS.includes(location as MenuLocation)) {
      errors.push(`Invalid menu location: ${location}`);
    }

    for (const item of items ?? []) {
      if (!commandIds.has(item.command)) {
        errors.push(`Menu command "${item.command}" is not declared in contributes.commands.`);
      }
    }
  }

  const keybindings = contributes.keybindings as
    | Array<{ command: string; key?: string }>
    | undefined;
  for (const keybinding of keybindings ?? []) {
    if (!commandIds.has(keybinding.command)) {
      errors.push(
        `Keybinding command "${keybinding.command}" is not declared in contributes.commands.`,
      );
    }

    if (!keybinding.key) {
      errors.push(`Keybinding for "${keybinding.command}" requires key.`);
    }
  }

  const allowedViewLocations = ['activityBar', 'sideBar', 'panel'];
  const views = contributes.views as
    | Record<string, Array<{ id?: string; name?: string }>>
    | undefined;
  for (const [location, items] of Object.entries(views ?? {})) {
    if (!allowedViewLocations.includes(location)) {
      errors.push(
        `Invalid view location: ${location}. Allowed: ${allowedViewLocations.join(', ')}`,
      );
    }

    for (const item of items ?? []) {
      if (!item.id) {
        errors.push(`View in "${location}" is missing required field: id.`);
      }
      if (!item.name) {
        errors.push(
          `View "${item.id ?? '(unknown)'}" in "${location}" is missing required field: name.`,
        );
      }
    }
  }

  if (!commands?.length) {
    warnings.push('Extension contributes no commands.');
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isValidExtensionName(name: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(name);
}

export function isValidPublisher(publisher: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(publisher);
}

export function isValidActivationEvent(event: string): boolean {
  if (event === '*' || event === 'onStartupFinished') return true;
  return VALID_ACTIVATION_PREFIXES.some((prefix) => event.startsWith(prefix));
}

export function isAllowedPermission(permission: string): boolean {
  return ALLOWED_PERMISSIONS.includes(permission as ExtensionPermission);
}

export function isAllowedMenuLocation(location: string): boolean {
  return ALLOWED_MENU_LOCATIONS.includes(location as MenuLocation);
}
