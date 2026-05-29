下面这套方案适合直接放到 `sql-studio` 的 `mvp` 分支里用。

当前项目是 pnpm workspace，范围包含 `apps/*`、`packages/*`、`extensions/*`、`templates/*`；根目录已经有 `tsx`，所以脚本可以直接写成 `scripts/size-report.ts`，不需要额外引入依赖。根构建脚本目前是 `pnpm -r build && cargo build --workspace`，桌面端是 `tsc && vite build`，所以体积脚本应该默认在构建后扫描产物目录，而不是自己负责构建。

## 目标

做一个根脚本：

```bash
pnpm size
```

输出类似：

```txt
Package size report

@sqlgui/desktop
  dir: apps/desktop/dist
  files: 18
  raw:    2.34 MB
  gzip:   742.13 KB
  brotli: 655.42 KB

@sqlgui/utils
  dir: packages/utils/dist
  files: 6
  raw:    18.33 KB
  gzip:   6.12 KB
  brotli: 5.41 KB
```

再提供 CI 模式：

```bash
pnpm size:ci
```

用于体积预算检查，超预算时直接 `exit(1)`。

---

## 设计原则

### 1. 默认只统计构建产物

扫描这些目录：

```txt
apps/*/dist
packages/*/dist
packages/*/build
extensions/*/dist
dist-packages/*.sgx
```

其中 `@sqlgui/desktop` 的产物来自 Vite 默认的 `dist` 目录；`@sqlgui/utils` 当前有明确的 `dist/cjs`、`dist/esm`、`dist/types` 输出。

### 2. 当前不应该强行统计所有 package

例如 `@sqlgui/ui` 当前 `exports` 指向 `src/index.tsx`，没有 `build` 脚本，也没有 `dist` 输出；`@sqlgui/api`、`@sqlgui/i18n`、`@sqlgui/extension-schema` 目前的 `build` 都是 `tsc --noEmit`，也不会产生真实包产物。脚本应该跳过这些包，而不是误报 0KB。

### 3. 同时输出 raw / gzip / brotli

建议输出：

```txt
raw     磁盘原始大小
gzip    常见 CDN / HTTP 传输大小
brotli  现代浏览器更接近真实传输大小
```

### 4. 默认忽略 sourcemap

`.map` 文件开发排查有用，但不应该默认进入体积预算。需要时用：

```bash
pnpm size -- --include-source-map
```

### 5. 支持 JSON 输出和预算检查

后续可以接 GitHub Actions：

```bash
pnpm size:ci
```

生成：

```txt
dist/size-report.json
```

也可以通过预算文件限制：

```json
{
  "entries": {
    "@sqlgui/desktop": {
      "gzip": "900 KB",
      "brotli": "850 KB"
    },
    "@sqlgui/utils": {
      "gzip": "30 KB"
    }
  }
}
```

---

# 代码草案

新增文件：

```txt
scripts/size-report.ts
```

```ts
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
        throw new Error(`Unknown option: ${arg}`);
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
```

---

# package.json 修改

根 `package.json` 增加：

```json
{
  "scripts": {
    "size": "tsx scripts/size-report.ts",
    "size:detail": "tsx scripts/size-report.ts --detail",
    "size:build": "pnpm build && pnpm size",
    "size:ci": "tsx scripts/size-report.ts --json dist/size-report.json --budget size-budget.json --fail-on-budget"
  }
}
```

你的根目录已经有 `tsx`，所以这个脚本不需要新增依赖。

---

# 新增预算文件

新增：

```txt
size-budget.json
```

初版可以先给宽松一点，主要用于防止误引入 Monaco、图标库、全量 shadcn、全量 locale 等导致体积暴涨。

```json
{
  "entries": {
    "@sqlgui/desktop": {
      "raw": "5 MB",
      "gzip": "1.5 MB",
      "brotli": "1.3 MB"
    },
    "@sqlgui/utils": {
      "raw": "100 KB",
      "gzip": "40 KB",
      "brotli": "35 KB"
    },
    "dist-packages": {
      "raw": "10 MB"
    }
  }
}
```

---

# 建议执行方式

本地看结果：

```bash
pnpm --filter @sqlgui/desktop build
pnpm --filter @sqlgui/utils build
pnpm size
```

看大文件明细：

```bash
pnpm size:detail
```

完整构建后统计：

```bash
pnpm size:build
```

CI 检查：

```bash
pnpm size:ci
```

如果想把 Tauri 打包产物也算进去：

```bash
pnpm size -- --include-native
```

Tauri 侧当前有 `apps/desktop/src-tauri/Cargo.toml`，包名是 `sqlgui-desktop`，所以后续 `tauri build` 后可以把 installer、bundle 这类 native 产物也纳入统计。

---

# 后续优化建议

第一版先做“统计 + 预算失败”就够了。后面可以继续加：

1. **PR 注释模式**
   GitHub Actions 里把 `dist/size-report.json` 读出来，评论到 PR。

2. **baseline 对比**
   保存 main 分支的 `size-report.json`，PR 里输出：

   ```txt
   @sqlgui/desktop gzip +32.4 KB
   @sqlgui/utils gzip -1.2 KB
   ```

3. **Vite bundle analyzer**
   这个脚本只回答“多大”，不回答“为什么大”。后续可以加 `rollup-plugin-visualizer`，用于分析 Monaco、React、Radix、icons、i18n locale 这些模块的占比。

4. **扩展包体积单独预算**
   你现在已有 `scripts/pack-extension.ts`，它会输出 `.sgx` 到 `dist-packages`，所以扩展市场做起来后，扩展包体积也应该单独设预算。
