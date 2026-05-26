import crypto from 'node:crypto';
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

interface ChecksumsFile {
  algorithm: string;
  files: Record<string, string>;
}

async function main() {
  const extensionDir = process.argv[2];
  const skipChecksum = process.argv.includes('--no-checksum');

  if (!extensionDir) {
    throw new Error('Usage: tsx scripts/pack-extension.ts <extension-dir> [--no-checksum]');
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

  if (!skipChecksum) {
    writeChecksums(absoluteDir);
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
  'dist-packages',
  '.sqlgui-keys',
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

function collectFiles(sourceDir: string): string[] {
  const files: string[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = path.relative(sourceDir, path.join(dir, entry.name));

      if (shouldIgnore(relativePath)) continue;

      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name));
      } else {
        files.push(relativePath);
      }
    }
  }

  walk(sourceDir);

  return files;
}

function generateChecksums(sourceDir: string): ChecksumsFile {
  const files = collectFiles(sourceDir);
  const result: Record<string, string> = {};

  for (const file of files) {
    if (file === 'checksums.json' || file === 'signature.sig') continue;

    const bytes = fs.readFileSync(path.join(sourceDir, file));
    result[file] = crypto.createHash('sha256').update(bytes).digest('hex');
  }

  return {
    algorithm: 'sha256',
    files: result,
  };
}

function writeChecksums(sourceDir: string) {
  const checksums = generateChecksums(sourceDir);
  fs.writeFileSync(path.join(sourceDir, 'checksums.json'), JSON.stringify(checksums, null, 2));
  console.log('Generated checksums.json');
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
