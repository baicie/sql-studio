import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'packages/i18n/src/locales');

const languages = ['zh-CN', 'en-US'] as const;
const namespaces = [
  'common',
  'workbench',
  'connection',
  'editor',
  'result',
  'extension',
  'marketplace',
  'settings',
  'error',
] as const;

type FlatKeys = string[];

function flatten(value: unknown, prefix = ''): FlatKeys {
  const keys: FlatKeys = [];

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        keys.push(...flatten(item, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
  } else {
    if (prefix) {
      keys.push(prefix);
    }
  }

  return keys;
}

function readJson(language: string, namespace: string) {
  const file = path.join(root, language, `${namespace}.json`);

  if (!fs.existsSync(file)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function getValueAtKey(content: unknown, key: string): unknown {
  const parts = key.split('.');
  let current: unknown = content;

  for (const part of parts) {
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

let hasError = false;

console.log('Checking i18n resources...\n');

for (const namespace of namespaces) {
  const base = flatten(readJson('zh-CN', namespace)).sort();

  for (const language of languages) {
    const content = readJson(language, namespace);
    const current = flatten(content).sort();

    const missing = base.filter((key) => !current.includes(key));
    const extra = current.filter((key) => !base.includes(key));

    if (missing.length || extra.length) {
      hasError = true;

      console.error(`\n[${language}/${namespace}] mismatch`);

      if (missing.length) {
        console.error('  Missing:', missing.join(', '));
      }

      if (extra.length) {
        console.error('  Extra:', extra.join(', '));
      }
    }

    for (const key of base) {
      const value = getValueAtKey(content, key);
      if (value === '' || value === null) {
        hasError = true;
        console.error(`\n[${language}/${namespace}] empty value at key: ${key}`);
      }
    }
  }
}

if (hasError) {
  console.error('\n❌ i18n resources have mismatches.');
  process.exit(1);
}

console.log('✅ i18n resources are valid.');
