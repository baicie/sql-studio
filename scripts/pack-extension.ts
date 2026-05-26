import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import JSZip from 'jszip';

interface ExtensionManifest {
  name: string;
  publisher: string;
  version: string;
  main?: string;
}

async function main() {
  const extensionDir = process.argv[2];

  if (!extensionDir) {
    throw new Error('Usage: tsx scripts/pack-extension.ts <extension-dir>');
  }

  const absoluteDir = path.resolve(extensionDir);
  const manifestPath = path.join(absoluteDir, 'sqlgui.extension.json');

  if (!fs.existsSync(manifestPath)) {
    throw new Error('Missing sqlgui.extension.json');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as ExtensionManifest;

  validateManifest(manifest);

  if (manifest.main) {
    const mainPath = path.join(absoluteDir, manifest.main);

    if (!fs.existsSync(mainPath)) {
      throw new Error(`Main file not found: ${manifest.main}`);
    }
  }

  const outDir = path.resolve('dist-packages');
  fs.mkdirSync(outDir, { recursive: true });

  const filename = `${manifest.publisher}.${manifest.name}-${manifest.version}.sgx`;
  const outPath = path.join(outDir, filename);

  await zipDirectory(absoluteDir, outPath);

  console.log(`Packed extension: ${outPath}`);
}

function validateManifest(manifest: ExtensionManifest) {
  if (!manifest.name) throw new Error('manifest.name is required');
  if (!manifest.publisher) throw new Error('manifest.publisher is required');
  if (!manifest.version) throw new Error('manifest.version is required');

  const pattern = /^[a-z0-9][a-z0-9-]*$/;

  if (!pattern.test(manifest.name)) {
    throw new Error('Invalid manifest.name');
  }

  if (!pattern.test(manifest.publisher)) {
    throw new Error('Invalid manifest.publisher');
  }
}

const IGNORE_PATTERNS = [
  'node_modules',
  'src',
  '.git',
  '*.tsbuildinfo',
  'vite.config.ts',
  'tsconfig.json',
];

function shouldIgnore(name: string): boolean {
  const base = path.basename(name);
  return IGNORE_PATTERNS.some((p) => {
    if (p.startsWith('*')) {
      const ext = p.slice(1);
      return base.endsWith(ext);
    }
    return name === p || name.startsWith(p + '/') || name.includes('/' + p + '/');
  });
}

async function zipDirectory(sourceDir: string, outPath: string) {
  const zip = new JSZip();

  function addDir(dir: string, prefix = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (shouldIgnore(relativePath)) continue;

      if (entry.isDirectory()) {
        addDir(path.join(dir, entry.name), relativePath);
      } else {
        const content = fs.readFileSync(path.join(dir, entry.name));
        zip.file(relativePath, content);
      }
    }
  }

  addDir(sourceDir);

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(outPath, buffer);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
