import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';

type ArtifactKind = 'package' | 'app' | 'extension-package' | 'native';

interface CliOptions {
  root: string;
  json?: string;
  budget?: string;
  detail: boolean;
  includeNative: boolean;
  includeSourceMap: boolean;
  failOnBudget: boolean;
}

interface ArtifactFile {
  relativePath: string;
  raw: number;
  gzip: number;
  brotli: number;
}

interface ArtifactGroup {
  name: string;
  kind: ArtifactKind;
  dir: string;
  files: ArtifactFile[];
  raw: number;
  gzip: number;
  brotli: number;
}

interface BudgetEntry {
  raw?: string;
  gzip?: string;
  brotli?: string;
}

interface BudgetConfig {
  entries?: Record<string, BudgetEntry>;
}

interface BudgetViolation {
  name: string;
  metric: keyof BudgetEntry;
  actual: number;
  limit: number;
}

const DEFAULT_OUTPUT_DIRS = ['dist', 'build', 'out'];

const RUNTIME_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.css',
  '.html',
  '.json',
  '.wasm',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.d.ts',
]);

function main() {
  const options = parseArgs(process.argv.slice(2));
  const groups = discoverArtifactGroups(options);

  if (groups.length === 0) {
    console.warn('No build artifacts found.');
    console.warn('Run `pnpm build` or `pnpm --filter @sqlgui/desktop build` first.');
    process.exit(0);
  }

  printReport(groups, options);

  if (options.json) {
    writeJsonReport(options.root, options.json, groups);
  }

  const violations = options.budget
    ? checkBudget(path.resolve(options.root, options.budget), groups)
    : [];

  if (violations.length > 0) {
    printBudgetViolations(violations);

    if (options.failOnBudget) {
      process.exit(1);
    }
  }
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    root: process.cwd(),
    detail: false,
    includeNative: false,
    includeSourceMap: false,
    failOnBudget: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--') {
      continue;
    }

    switch (arg) {
      case '--root':
        options.root = path.resolve(requireValue(args, ++i, arg));
        break;
      case '--json':
        options.json = requireValue(args, ++i, arg);
        break;
      case '--budget':
        options.budget = requireValue(args, ++i, arg);
        break;
      case '--detail':
        options.detail = true;
        break;
      case '--include-native':
        options.includeNative = true;
        break;
      case '--include-source-map':
        options.includeSourceMap = true;
        break;
      case '--fail-on-budget':
        options.failOnBudget = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          throw new Error(`Unknown option: ${arg}`);
        }
    }
  }

  return options;
}

function requireValue(args: string[], index: number, flag: string): string {
  const value = args[index];

  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${flag}`);
  }

  return value;
}

function printHelp() {
  console.log(`
Usage:
  pnpm size
  pnpm size -- --detail
  pnpm size -- --json dist/size-report.json
  pnpm size -- --budget size-budget.json --fail-on-budget

Options:
  --root <dir>              Project root. Default: process.cwd()
  --json <file>             Write JSON report
  --budget <file>           Read size budget JSON
  --detail                  Print top files for each artifact group
  --include-native          Include Tauri/native bundle outputs
  --include-source-map      Include .map files
  --fail-on-budget          Exit with code 1 when budget exceeded
`);
}

function discoverArtifactGroups(options: CliOptions): ArtifactGroup[] {
  const groups: ArtifactGroup[] = [];
  const workspaceDirs = discoverWorkspaceDirs(options.root);

  for (const packageDir of workspaceDirs) {
    const packageJsonPath = path.join(packageDir, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      continue;
    }

    const packageJson = readJson<{ name?: string }>(packageJsonPath);
    const packageName = packageJson.name ?? path.relative(options.root, packageDir);

    for (const outputDirName of DEFAULT_OUTPUT_DIRS) {
      const outputDir = path.join(packageDir, outputDirName);

      if (!isDirectory(outputDir)) {
        continue;
      }

      const files = collectArtifactFiles(outputDir, outputDir, options);

      if (files.length === 0) {
        continue;
      }

      groups.push(
        createGroup({
          name: packageName,
          kind: packageDir.includes(`${path.sep}apps${path.sep}`) ? 'app' : 'package',
          dir: path.relative(options.root, outputDir),
          files,
        }),
      );
    }
  }

  groups.push(...discoverExtensionPackages(options));

  if (options.includeNative) {
    groups.push(...discoverNativeArtifacts(options));
  }

  return groups.sort((a, b) => a.name.localeCompare(b.name));
}

function discoverWorkspaceDirs(root: string): string[] {
  const workspacePath = path.join(root, 'pnpm-workspace.yaml');

  if (!fs.existsSync(workspacePath)) {
    return [];
  }

  const patterns = readWorkspacePackagePatterns(workspacePath);
  const dirs: string[] = [];

  for (const pattern of patterns) {
    dirs.push(...expandSimpleWorkspacePattern(root, pattern));
  }

  return Array.from(new Set(dirs)).sort();
}

function readWorkspacePackagePatterns(workspacePath: string): string[] {
  const content = fs.readFileSync(workspacePath, 'utf-8');
  const patterns: string[] = [];
  let inPackages = false;

  for (const line of content.split(/\r?\n/)) {
    const sectionMatch = line.match(/^([a-zA-Z][\w-]*):\s*$/);

    if (sectionMatch) {
      inPackages = sectionMatch[1] === 'packages';
      continue;
    }

    if (!inPackages) {
      continue;
    }

    const itemMatch = line.match(/^\s*-\s*['"]?([^'"]+)['"]?\s*$/);

    if (itemMatch) {
      patterns.push(itemMatch[1]);
    }
  }

  return patterns;
}

function expandSimpleWorkspacePattern(root: string, pattern: string): string[] {
  const normalizedPattern = pattern.replace(/\\/g, '/');
  const starIndex = normalizedPattern.indexOf('*');

  if (starIndex === -1) {
    const absolutePath = path.resolve(root, normalizedPattern);
    return isDirectory(absolutePath) ? [absolutePath] : [];
  }

  const prefix = normalizedPattern.slice(0, starIndex).replace(/\/$/, '');
  const suffix = normalizedPattern.slice(starIndex + 1).replace(/^\//, '');
  const baseDir = path.resolve(root, prefix);

  if (!isDirectory(baseDir)) {
    return [];
  }

  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(baseDir, entry.name, suffix))
    .filter((dir) => isDirectory(dir));
}

function discoverExtensionPackages(options: CliOptions): ArtifactGroup[] {
  const distPackagesDir = path.join(options.root, 'dist-packages');

  if (!isDirectory(distPackagesDir)) {
    return [];
  }

  const files = fs
    .readdirSync(distPackagesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sgx'))
    .map((entry) => {
      const filePath = path.join(distPackagesDir, entry.name);
      return measureFile(filePath, entry.name);
    });

  if (files.length === 0) {
    return [];
  }

  return [
    createGroup({
      name: 'dist-packages',
      kind: 'extension-package',
      dir: path.relative(options.root, distPackagesDir),
      files,
    }),
  ];
}

function discoverNativeArtifacts(options: CliOptions): ArtifactGroup[] {
  const candidates = [
    path.join(options.root, 'target', 'release', 'bundle'),
    path.join(options.root, 'apps', 'desktop', 'src-tauri', 'target', 'release', 'bundle'),
  ];

  const groups: ArtifactGroup[] = [];

  for (const dir of candidates) {
    if (!isDirectory(dir)) {
      continue;
    }

    const files = collectArtifactFiles(dir, dir, {
      ...options,
      includeSourceMap: true,
    });

    if (files.length === 0) {
      continue;
    }

    groups.push(
      createGroup({
        name: 'native-bundle',
        kind: 'native',
        dir: path.relative(options.root, dir),
        files,
      }),
    );
  }

  return groups;
}

function collectArtifactFiles(
  baseDir: string,
  currentDir: string,
  options: CliOptions,
): ArtifactFile[] {
  const files: ArtifactFile[] = [];
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    const relativePath = normalizePath(path.relative(baseDir, absolutePath));

    if (entry.isDirectory()) {
      if (shouldIgnoreDirectory(entry.name)) {
        continue;
      }

      files.push(...collectArtifactFiles(baseDir, absolutePath, options));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!shouldIncludeFile(relativePath, options)) {
      continue;
    }

    files.push(measureFile(absolutePath, relativePath));
  }

  return files.sort((a, b) => b.raw - a.raw);
}

function shouldIgnoreDirectory(name: string): boolean {
  return name === 'node_modules' || name === '.git' || name === '.cache';
}

function shouldIncludeFile(relativePath: string, options: CliOptions): boolean {
  if (!options.includeSourceMap && relativePath.endsWith('.map')) {
    return false;
  }

  if (relativePath.endsWith('.d.ts')) {
    return true;
  }

  const ext = path.extname(relativePath).toLowerCase();

  if (options.includeNative) {
    return true;
  }

  return RUNTIME_EXTENSIONS.has(ext);
}

function measureFile(filePath: string, relativePath: string): ArtifactFile {
  const buffer = fs.readFileSync(filePath);

  return {
    relativePath,
    raw: buffer.byteLength,
    gzip: zlib.gzipSync(buffer, { level: 9 }).byteLength,
    brotli: zlib.brotliCompressSync(buffer, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
      },
    }).byteLength,
  };
}

function createGroup(input: {
  name: string;
  kind: ArtifactKind;
  dir: string;
  files: ArtifactFile[];
}): ArtifactGroup {
  return {
    ...input,
    raw: sum(input.files, 'raw'),
    gzip: sum(input.files, 'gzip'),
    brotli: sum(input.files, 'brotli'),
  };
}

function sum(files: ArtifactFile[], key: 'raw' | 'gzip' | 'brotli'): number {
  return files.reduce((total, file) => total + file[key], 0);
}

function printReport(groups: ArtifactGroup[], options: CliOptions) {
  console.log('\nPackage size report\n');

  for (const group of groups) {
    console.log(group.name);
    console.log(`  kind:   ${group.kind}`);
    console.log(`  dir:    ${group.dir}`);
    console.log(`  files:  ${group.files.length}`);
    console.log(`  raw:    ${formatBytes(group.raw)}`);
    console.log(`  gzip:   ${formatBytes(group.gzip)}`);
    console.log(`  brotli: ${formatBytes(group.brotli)}`);

    if (options.detail) {
      const topFiles = group.files.slice(0, 15);

      console.log('  top files:');

      for (const file of topFiles) {
        console.log(
          `    ${formatBytes(file.raw).padStart(10)} raw  ${formatBytes(file.gzip).padStart(10)} gzip  ${file.relativePath}`,
        );
      }
    }

    console.log('');
  }
}

function writeJsonReport(root: string, outputPath: string, groups: ArtifactGroup[]) {
  const absoluteOutputPath = path.resolve(root, outputPath);

  fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });

  fs.writeFileSync(
    absoluteOutputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        groups,
      },
      null,
      2,
    ),
  );

  console.log(`Wrote JSON report: ${path.relative(root, absoluteOutputPath)}`);
}

function checkBudget(budgetPath: string, groups: ArtifactGroup[]): BudgetViolation[] {
  if (!fs.existsSync(budgetPath)) {
    throw new Error(`Budget file not found: ${budgetPath}`);
  }

  const budget = readJson<BudgetConfig>(budgetPath);
  const entries = budget.entries ?? {};
  const violations: BudgetViolation[] = [];

  for (const group of groups) {
    const entry = entries[group.name];

    if (!entry) {
      continue;
    }

    for (const metric of ['raw', 'gzip', 'brotli'] as const) {
      const limitText = entry[metric];

      if (!limitText) {
        continue;
      }

      const limit = parseBytes(limitText);
      const actual = group[metric];

      if (actual > limit) {
        violations.push({
          name: group.name,
          metric,
          actual,
          limit,
        });
      }
    }
  }

  return violations;
}

function printBudgetViolations(violations: BudgetViolation[]) {
  console.error('\nSize budget exceeded:\n');

  for (const violation of violations) {
    console.error(
      `  ${violation.name} ${violation.metric}: ${formatBytes(violation.actual)} > ${formatBytes(violation.limit)}`,
    );
  }

  console.error('');
}

function parseBytes(input: string): number {
  const match = input.trim().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i);

  if (!match) {
    throw new Error(`Invalid size value: ${input}`);
  }

  const value = Number(match[1]);
  const unit = (match[2] ?? 'b').toLowerCase();

  switch (unit) {
    case 'b':
      return value;
    case 'kb':
      return value * 1024;
    case 'mb':
      return value * 1024 * 1024;
    case 'gb':
      return value * 1024 * 1024 * 1024;
    default:
      throw new Error(`Unsupported size unit: ${unit}`);
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function isDirectory(filePath: string): boolean {
  return fs.existsSync(filePath) && fs.statSync(filePath).isDirectory();
}

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

main();
