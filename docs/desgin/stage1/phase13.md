下面是 **Phase 13：Mock 插件市场 / Marketplace MVP 详细设计与代码草案**。

这一阶段目标是：

> **先不做真正线上插件市场，而是用本地 mock 数据模拟市场能力，完整跑通插件发现、搜索、详情、权限展示、安装、卸载、启用/禁用这条链路。**

Phase 12 已经完成：

```txt
.sgx 插件包
本地插件安装
从文件夹加载
卸载插件
installed-extensions.json
```

Phase 13 要在它上面加一层：

```txt
Marketplace UI
  ↓
mock marketplace.json
  ↓
插件列表 / 搜索 / 分类
  ↓
插件详情
  ↓
安装按钮
  ↓
下载/读取本地 .sgx
  ↓
调用 extension_install_from_package
  ↓
安装完成后 reload extensions
```

---

# 1. Phase 13 总目标

## 1.1 必做功能

```txt
[ ] 定义 MarketplaceExtension 类型
[ ] 定义 marketplace.mock.json
[ ] 实现 MarketplaceService
[ ] 支持搜索插件
[ ] 支持分类筛选
[ ] 支持排序
[ ] 支持查看插件详情
[ ] 支持展示插件权限
[ ] 支持展示版本、作者、描述、README
[ ] 支持安装 mock 插件
[ ] 支持卸载已安装插件
[ ] 支持启用/禁用已安装插件
[ ] 支持安装状态展示
[ ] 支持安装失败展示
[ ] 支持市场页面和 Installed Extensions 页面联动
[ ] 支持从 local:// 地址安装本地 .sgx
[ ] 支持未来切换到 remote marketplace
```

## 1.2 暂不做

```txt
[ ] 不做真实服务端
[ ] 不做账号体系
[ ] 不做评论评分提交
[ ] 不做真实下载进度
[ ] 不做自动更新
[ ] 不做插件签名
[ ] 不做付费插件
[ ] 不做远程发布
[ ] 不做 CDN
```

Phase 13 的定位是：

> **插件市场前端形态 + 安装链路验证。**

---

# 2. 最终效果

市场页大概这样：

```txt
Extensions Marketplace

Search extensions...
[All] [Formatter] [Database] [Visualization] [Theme] [Snippets]

┌──────────────────────────────────────────────┐
│ SQL Formatter Demo                           │
│ baicie · v0.1.0 · Formatter                  │
│ Format SQL in editor.                        │
│ Permissions: editor.read, editor.write       │
│ [Install]                                    │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Explain Viewer Demo                          │
│ baicie · v0.1.0 · Database                   │
│ Run EXPLAIN for current SQL.                 │
│ [Install]                                    │
└──────────────────────────────────────────────┘
```

插件详情：

```txt
SQL Formatter Demo
baicie.sql-formatter-demo
v0.1.0

Format SQL in editor.

[Install] / [Uninstall] / [Disable]

Permissions:
- editor.read
- editor.write
- ui.notification

README:
...
```

---

# 3. 目录设计

```txt
apps/desktop/src/plugins/marketplace/
├─ components/
│  ├─ MarketplaceView.tsx
│  ├─ MarketplaceHeader.tsx
│  ├─ MarketplaceSearch.tsx
│  ├─ MarketplaceCategoryTabs.tsx
│  ├─ MarketplaceExtensionList.tsx
│  ├─ MarketplaceExtensionCard.tsx
│  ├─ MarketplaceExtensionDetail.tsx
│  ├─ MarketplaceInstallButton.tsx
│  ├─ MarketplacePermissionPreview.tsx
│  ├─ MarketplaceReadme.tsx
│  └─ MarketplaceEmptyState.tsx
│
├─ services/
│  ├─ marketplaceService.ts
│  ├─ marketplaceInstallService.ts
│  ├─ marketplaceSourceResolver.ts
│  └─ marketplaceMockLoader.ts
│
├─ store/
│  └─ marketplaceStore.ts
│
├─ data/
│  └─ marketplace.mock.json
│
├─ types.ts
└─ index.ts
```

和已有插件模块关系：

```txt
plugins/
├─ services/
│  ├─ extensionService.ts
│  └─ extensionInstallerService.ts
├─ permissions/
│  └─ ...
├─ marketplace/
│  └─ ...
```

---

# 4. Marketplace 数据模型

## 4.1 MarketplaceExtension

```ts
// apps/desktop/src/plugins/marketplace/types.ts

import type { ExtensionPermission } from '@sqlgui/api';

export type MarketplaceInstallSource =
  | {
      type: 'localPackage';
      path: string;
    }
  | {
      type: 'localFolder';
      path: string;
      mode: 'copy' | 'link';
    }
  | {
      type: 'remotePackage';
      url: string;
      sha256?: string;
    };

export type MarketplaceExtensionCategory =
  | 'Formatter'
  | 'Database'
  | 'Visualization'
  | 'Theme'
  | 'Snippets'
  | 'Productivity'
  | 'Other';

export interface MarketplaceExtension {
  id: string;
  name: string;
  displayName: string;
  publisher: string;
  version: string;
  description: string;

  categories: MarketplaceExtensionCategory[];
  tags: string[];

  permissions: ExtensionPermission[];

  source: MarketplaceInstallSource;

  icon?: string;
  readme?: string;
  repository?: string;
  homepage?: string;
  license?: string;

  verified?: boolean;
  builtin?: boolean;

  stats?: {
    downloads?: number;
    rating?: number;
  };

  updatedAt?: number;
}

export interface MarketplaceSearchOptions {
  query?: string;
  category?: MarketplaceExtensionCategory | 'All';
  sortBy?: 'relevance' | 'downloads' | 'updated' | 'name';
}

export interface MarketplaceInstallState {
  extensionId: string;
  status: 'idle' | 'installing' | 'installed' | 'failed';
  error?: string;
}
```

---

# 5. Mock 数据设计

```json
// apps/desktop/src/plugins/marketplace/data/marketplace.mock.json

[
  {
    "id": "baicie.sql-formatter-demo",
    "name": "sql-formatter-demo",
    "displayName": "SQL Formatter Demo",
    "publisher": "baicie",
    "version": "0.1.0",
    "description": "Format SQL in the active editor.",
    "categories": ["Formatter"],
    "tags": ["sql", "formatter", "editor"],
    "permissions": ["editor.read", "editor.write", "ui.notification"],
    "source": {
      "type": "localPackage",
      "path": "dist-packages/baicie.sql-formatter-demo-0.1.0.sgx"
    },
    "readme": "# SQL Formatter Demo\n\nA demo extension that formats SQL in the active editor.\n\n## Features\n\n- Format selected SQL\n- Format full editor content\n- Works from command palette\n",
    "verified": true,
    "builtin": false,
    "stats": {
      "downloads": 128,
      "rating": 4.8
    },
    "updatedAt": 1770000000000
  },
  {
    "id": "baicie.explain-viewer-demo",
    "name": "explain-viewer-demo",
    "displayName": "Explain Viewer Demo",
    "publisher": "baicie",
    "version": "0.1.0",
    "description": "Run EXPLAIN for the selected SQL and show the result.",
    "categories": ["Database", "Visualization"],
    "tags": ["sql", "explain", "query-plan"],
    "permissions": ["editor.read", "db.connection.read", "db.query.explain", "ui.notification"],
    "source": {
      "type": "localPackage",
      "path": "dist-packages/baicie.explain-viewer-demo-0.1.0.sgx"
    },
    "readme": "# Explain Viewer Demo\n\nRun EXPLAIN against the current SQL query.\n",
    "verified": true,
    "builtin": false,
    "stats": {
      "downloads": 64,
      "rating": 4.6
    },
    "updatedAt": 1770000000000
  },
  {
    "id": "baicie.sql-snippets-demo",
    "name": "sql-snippets-demo",
    "displayName": "SQL Snippets Demo",
    "publisher": "baicie",
    "version": "0.1.0",
    "description": "Insert common SQL snippets into the active editor.",
    "categories": ["Snippets", "Productivity"],
    "tags": ["sql", "snippets"],
    "permissions": ["editor.write", "ui.notification"],
    "source": {
      "type": "localPackage",
      "path": "dist-packages/baicie.sql-snippets-demo-0.1.0.sgx"
    },
    "readme": "# SQL Snippets Demo\n\nProvides common SQL snippets.\n",
    "verified": false,
    "builtin": false,
    "stats": {
      "downloads": 32,
      "rating": 4.2
    },
    "updatedAt": 1770000000000
  }
]
```

---

# 6. MarketplaceService

负责搜索、过滤、详情获取。

```ts
// apps/desktop/src/plugins/marketplace/services/marketplaceService.ts

import mockExtensions from '../data/marketplace.mock.json';
import type { MarketplaceExtension, MarketplaceSearchOptions } from '../types';

class MarketplaceService {
  private extensions: MarketplaceExtension[] = mockExtensions as MarketplaceExtension[];

  async search(options: MarketplaceSearchOptions = {}): Promise<MarketplaceExtension[]> {
    const query = options.query?.trim().toLowerCase();
    const category = options.category ?? 'All';

    let result = [...this.extensions];

    if (query) {
      result = result.filter((extension) => {
        const haystack = [
          extension.displayName,
          extension.name,
          extension.publisher,
          extension.description,
          ...extension.tags,
          ...extension.categories,
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(query);
      });
    }

    if (category !== 'All') {
      result = result.filter((extension) => extension.categories.includes(category));
    }

    return sortExtensions(result, options.sortBy ?? 'relevance');
  }

  async getById(extensionId: string): Promise<MarketplaceExtension | undefined> {
    return this.extensions.find((item) => item.id === extensionId);
  }

  async getCategories() {
    const categories = new Set<string>();

    for (const extension of this.extensions) {
      for (const category of extension.categories) {
        categories.add(category);
      }
    }

    return ['All', ...Array.from(categories).sort()] as const;
  }

  setMockExtensions(extensions: MarketplaceExtension[]) {
    this.extensions = extensions;
  }
}

function sortExtensions(
  extensions: MarketplaceExtension[],
  sortBy: MarketplaceSearchOptions['sortBy'],
) {
  if (sortBy === 'downloads') {
    return extensions.sort((a, b) => (b.stats?.downloads ?? 0) - (a.stats?.downloads ?? 0));
  }

  if (sortBy === 'updated') {
    return extensions.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }

  if (sortBy === 'name') {
    return extensions.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  return extensions;
}

export const marketplaceService = new MarketplaceService();
```

---

# 7. MarketplaceStore

```ts
// apps/desktop/src/plugins/marketplace/store/marketplaceStore.ts

import { create } from 'zustand';
import type {
  MarketplaceExtension,
  MarketplaceExtensionCategory,
  MarketplaceInstallState,
} from '../types';
import { marketplaceService } from '../services/marketplaceService';

interface MarketplaceStore {
  query: string;
  category: MarketplaceExtensionCategory | 'All';
  sortBy: 'relevance' | 'downloads' | 'updated' | 'name';

  loading: boolean;
  extensions: MarketplaceExtension[];
  selectedExtensionId?: string;

  installState: Record<string, MarketplaceInstallState>;

  setQuery: (query: string) => void;
  setCategory: (category: MarketplaceExtensionCategory | 'All') => void;
  setSortBy: (sortBy: MarketplaceStore['sortBy']) => void;
  setSelectedExtension: (extensionId?: string) => void;

  load: () => Promise<void>;

  setInstallState: (extensionId: string, patch: Partial<MarketplaceInstallState>) => void;

  getSelectedExtension: () => MarketplaceExtension | undefined;
}

export const useMarketplaceStore = create<MarketplaceStore>((set, get) => ({
  query: '',
  category: 'All',
  sortBy: 'relevance',

  loading: false,
  extensions: [],
  selectedExtensionId: undefined,

  installState: {},

  setQuery: (query) => {
    set({ query });
    void get().load();
  },

  setCategory: (category) => {
    set({ category });
    void get().load();
  },

  setSortBy: (sortBy) => {
    set({ sortBy });
    void get().load();
  },

  setSelectedExtension: (extensionId) =>
    set({
      selectedExtensionId: extensionId,
    }),

  load: async () => {
    const { query, category, sortBy } = get();

    set({ loading: true });

    try {
      const extensions = await marketplaceService.search({
        query,
        category,
        sortBy,
      });

      set({ extensions });
    } finally {
      set({ loading: false });
    }
  },

  setInstallState: (extensionId, patch) =>
    set((state) => ({
      installState: {
        ...state.installState,
        [extensionId]: {
          extensionId,
          status: 'idle',
          ...state.installState[extensionId],
          ...patch,
        },
      },
    })),

  getSelectedExtension: () => {
    const state = get();

    return state.extensions.find((item) => item.id === state.selectedExtensionId);
  },
}));
```

---

# 8. Source Resolver

Phase 13 的 mock marketplace 里 `localPackage.path` 是相对路径，需要解析成真实路径。

## 8.1 前端 resolver

如果前端无法直接拿项目根目录，推荐通过 Rust 或环境变量解决。MVP 可使用 Tauri command 根据相对路径解析。

先定义前端服务：

```ts
// apps/desktop/src/plugins/marketplace/services/marketplaceSourceResolver.ts

import { callNative } from '@/services/native/invoke';
import type { MarketplaceInstallSource } from '../types';

export const marketplaceSourceResolver = {
  async resolvePackagePath(source: MarketplaceInstallSource) {
    if (source.type === 'localPackage') {
      return callNative<string>('marketplace_resolve_local_package', {
        path: source.path,
      });
    }

    if (source.type === 'remotePackage') {
      throw new Error('Remote package download is not implemented in MVP.');
    }

    throw new Error(`Unsupported source type: ${source.type}`);
  },
};
```

---

## 8.2 Rust command

```rust
// apps/desktop/src-tauri/src/commands/marketplace.rs

use std::path::PathBuf;

#[tauri::command]
pub async fn marketplace_resolve_local_package(
    path: String,
) -> Result<String, String> {
    let input = PathBuf::from(&path);

    if input.is_absolute() {
        return Ok(input.to_string_lossy().to_string());
    }

    // 开发期可以通过环境变量指定仓库根目录
    if let Ok(root) = std::env::var("SQLGUI_REPO_ROOT") {
        let resolved = PathBuf::from(root).join(input);
        return Ok(resolved.to_string_lossy().to_string());
    }

    // fallback：当前工作目录
    let cwd = std::env::current_dir().map_err(|err| err.to_string())?;
    let resolved = cwd.join(input);

    Ok(resolved.to_string_lossy().to_string())
}
```

注册：

```rust
.invoke_handler(tauri::generate_handler![
    commands::marketplace::marketplace_resolve_local_package,
])
```

---

# 9. MarketplaceInstallService

负责把市场插件安装到本地。

```ts
// apps/desktop/src/plugins/marketplace/services/marketplaceInstallService.ts

import type { MarketplaceExtension } from '../types';
import { marketplaceSourceResolver } from './marketplaceSourceResolver';
import { extensionService } from '@/plugins/services/extensionService';
import { useMarketplaceStore } from '../store/marketplaceStore';

export const marketplaceInstallService = {
  async install(extension: MarketplaceExtension) {
    const store = useMarketplaceStore.getState();

    store.setInstallState(extension.id, {
      status: 'installing',
      error: undefined,
    });

    try {
      if (extension.source.type === 'localPackage') {
        const packagePath = await marketplaceSourceResolver.resolvePackagePath(extension.source);

        await extensionService.installFromPackage(packagePath);
      } else if (extension.source.type === 'localFolder') {
        if (extension.source.mode === 'link') {
          await extensionService.installFromFolderLink(extension.source.path);
        } else {
          await extensionService.installFromFolderCopy(extension.source.path);
        }
      } else {
        throw new Error('Remote package install is not implemented.');
      }

      store.setInstallState(extension.id, {
        status: 'installed',
      });
    } catch (error) {
      store.setInstallState(extension.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  },

  async uninstall(extensionId: string) {
    const store = useMarketplaceStore.getState();

    store.setInstallState(extensionId, {
      status: 'installing',
      error: undefined,
    });

    try {
      await extensionService.uninstall(extensionId);

      store.setInstallState(extensionId, {
        status: 'idle',
      });
    } catch (error) {
      store.setInstallState(extensionId, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  },
};
```

---

# 10. 安装状态判断

Marketplace UI 要知道插件是否已安装。

```ts
// apps/desktop/src/plugins/marketplace/services/marketplaceInstallStatus.ts

import { extensionRegistry } from '@/plugins/registry/extensionRegistry';

export function getInstalledMarketplaceExtension(extensionId: string) {
  return extensionRegistry.get(extensionId);
}

export function isMarketplaceExtensionInstalled(extensionId: string) {
  return Boolean(extensionRegistry.get(extensionId));
}

export function isMarketplaceExtensionEnabled(extensionId: string) {
  return extensionRegistry.get(extensionId)?.state === 'enabled';
}
```

---

# 11. MarketplaceView

```tsx
// apps/desktop/src/plugins/marketplace/components/MarketplaceView.tsx

import { useEffect } from 'react';
import { useMarketplaceStore } from '../store/marketplaceStore';
import { MarketplaceHeader } from './MarketplaceHeader';
import { MarketplaceExtensionList } from './MarketplaceExtensionList';
import { MarketplaceExtensionDetail } from './MarketplaceExtensionDetail';
import { MarketplaceEmptyState } from './MarketplaceEmptyState';

export function MarketplaceView() {
  const extensions = useMarketplaceStore((state) => state.extensions);
  const loading = useMarketplaceStore((state) => state.loading);
  const selectedExtensionId = useMarketplaceStore((state) => state.selectedExtensionId);
  const load = useMarketplaceStore((state) => state.load);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = extensions.find((item) => item.id === selectedExtensionId);

  return (
    <div className="flex h-full flex-col">
      <MarketplaceHeader />

      <div className="flex min-h-0 flex-1">
        <div className="w-[360px] border-r">
          {loading ? (
            <div className="p-3 text-sm text-muted-foreground">Loading extensions...</div>
          ) : extensions.length ? (
            <MarketplaceExtensionList extensions={extensions} />
          ) : (
            <MarketplaceEmptyState />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {selected ? (
            <MarketplaceExtensionDetail extension={selected} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select an extension to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

# 12. MarketplaceHeader

```tsx
// apps/desktop/src/plugins/marketplace/components/MarketplaceHeader.tsx

import { MarketplaceSearch } from './MarketplaceSearch';
import { MarketplaceCategoryTabs } from './MarketplaceCategoryTabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMarketplaceStore } from '../store/marketplaceStore';

export function MarketplaceHeader() {
  const sortBy = useMarketplaceStore((state) => state.sortBy);
  const setSortBy = useMarketplaceStore((state) => state.setSortBy);

  return (
    <div className="space-y-2 border-b p-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Extensions Marketplace</h1>
          <p className="text-xs text-muted-foreground">Discover and install SQL GUI extensions.</p>
        </div>

        <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
          <SelectTrigger className="h-8 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Relevance</SelectItem>
            <SelectItem value="downloads">Downloads</SelectItem>
            <SelectItem value="updated">Updated</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <MarketplaceSearch />
      <MarketplaceCategoryTabs />
    </div>
  );
}
```

---

# 13. MarketplaceSearch

```tsx
// apps/desktop/src/plugins/marketplace/components/MarketplaceSearch.tsx

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMarketplaceStore } from '../store/marketplaceStore';

export function MarketplaceSearch() {
  const query = useMarketplaceStore((state) => state.query);
  const setQuery = useMarketplaceStore((state) => state.setQuery);

  return (
    <div className="relative">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />

      <Input
        className="pl-8"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search extensions..."
      />
    </div>
  );
}
```

---

# 14. MarketplaceCategoryTabs

```tsx
// apps/desktop/src/plugins/marketplace/components/MarketplaceCategoryTabs.tsx

import type { MarketplaceExtensionCategory } from '../types';
import { useMarketplaceStore } from '../store/marketplaceStore';

const categories: Array<MarketplaceExtensionCategory | 'All'> = [
  'All',
  'Formatter',
  'Database',
  'Visualization',
  'Theme',
  'Snippets',
  'Productivity',
  'Other',
];

export function MarketplaceCategoryTabs() {
  const active = useMarketplaceStore((state) => state.category);
  const setCategory = useMarketplaceStore((state) => state.setCategory);

  return (
    <div className="flex flex-wrap gap-1">
      {categories.map((category) => (
        <button
          key={category}
          className={[
            'rounded-md px-2 py-1 text-xs',
            active === category
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground',
          ].join(' ')}
          onClick={() => setCategory(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
```

---

# 15. MarketplaceExtensionList

```tsx
// apps/desktop/src/plugins/marketplace/components/MarketplaceExtensionList.tsx

import type { MarketplaceExtension } from '../types';
import { MarketplaceExtensionCard } from './MarketplaceExtensionCard';

interface MarketplaceExtensionListProps {
  extensions: MarketplaceExtension[];
}

export function MarketplaceExtensionList(props: MarketplaceExtensionListProps) {
  return (
    <div className="h-full overflow-auto p-2">
      {props.extensions.map((extension) => (
        <MarketplaceExtensionCard key={extension.id} extension={extension} />
      ))}
    </div>
  );
}
```

---

# 16. MarketplaceExtensionCard

```tsx
// apps/desktop/src/plugins/marketplace/components/MarketplaceExtensionCard.tsx

import { ShieldCheck, Download } from 'lucide-react';
import type { MarketplaceExtension } from '../types';
import { useMarketplaceStore } from '../store/marketplaceStore';
import { MarketplaceInstallButton } from './MarketplaceInstallButton';
import { isMarketplaceExtensionInstalled } from '../services/marketplaceInstallStatus';

interface MarketplaceExtensionCardProps {
  extension: MarketplaceExtension;
}

export function MarketplaceExtensionCard(props: MarketplaceExtensionCardProps) {
  const { extension } = props;
  const selectedExtensionId = useMarketplaceStore((state) => state.selectedExtensionId);
  const setSelectedExtension = useMarketplaceStore((state) => state.setSelectedExtension);

  const selected = selectedExtensionId === extension.id;
  const installed = isMarketplaceExtensionInstalled(extension.id);

  return (
    <div
      className={[
        'mb-2 cursor-default rounded-md border p-3 hover:bg-accent/40',
        selected ? 'border-primary bg-accent/50' : '',
      ].join(' ')}
      onClick={() => setSelectedExtension(extension.id)}
    >
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium">
          {extension.displayName.slice(0, 1).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <div className="truncate text-sm font-medium">{extension.displayName}</div>

            {extension.verified ? <ShieldCheck className="h-3 w-3 text-blue-500" /> : null}
          </div>

          <div className="text-xs text-muted-foreground">
            {extension.publisher} · v{extension.version}
          </div>

          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{extension.description}</p>

          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{extension.categories.join(', ')}</span>

            {typeof extension.stats?.downloads === 'number' ? (
              <span className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                {extension.stats.downloads}
              </span>
            ) : null}

            {installed ? <span className="text-green-600">Installed</span> : null}
          </div>
        </div>

        <div onClick={(event) => event.stopPropagation()}>
          <MarketplaceInstallButton extension={extension} compact />
        </div>
      </div>
    </div>
  );
}
```

---

# 17. MarketplaceInstallButton

```tsx
// apps/desktop/src/plugins/marketplace/components/MarketplaceInstallButton.tsx

import { Button } from '@/components/ui/button';
import type { MarketplaceExtension } from '../types';
import { useMarketplaceStore } from '../store/marketplaceStore';
import { marketplaceInstallService } from '../services/marketplaceInstallService';
import {
  isMarketplaceExtensionEnabled,
  isMarketplaceExtensionInstalled,
} from '../services/marketplaceInstallStatus';
import { extensionService } from '@/plugins/services/extensionService';

interface MarketplaceInstallButtonProps {
  extension: MarketplaceExtension;
  compact?: boolean;
}

export function MarketplaceInstallButton(props: MarketplaceInstallButtonProps) {
  const { extension, compact } = props;

  const installState = useMarketplaceStore((state) => state.installState[extension.id]);

  const installing = installState?.status === 'installing';
  const installed = isMarketplaceExtensionInstalled(extension.id);
  const enabled = isMarketplaceExtensionEnabled(extension.id);

  async function handleInstall() {
    await marketplaceInstallService.install(extension);
  }

  async function handleUninstall() {
    await marketplaceInstallService.uninstall(extension.id);
  }

  async function handleEnableDisable() {
    if (enabled) {
      await extensionService.disable(extension.id);
    } else {
      await extensionService.enable(extension.id);
    }
  }

  if (installing) {
    return (
      <Button size={compact ? 'sm' : 'default'} disabled>
        Installing...
      </Button>
    );
  }

  if (!installed) {
    return (
      <Button size={compact ? 'sm' : 'default'} onClick={handleInstall}>
        Install
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
      <Button size={compact ? 'sm' : 'default'} variant="outline" onClick={handleEnableDisable}>
        {enabled ? 'Disable' : 'Enable'}
      </Button>

      {!compact ? (
        <Button size="default" variant="destructive" onClick={handleUninstall}>
          Uninstall
        </Button>
      ) : null}
    </div>
  );
}
```

---

# 18. MarketplaceExtensionDetail

```tsx
// apps/desktop/src/plugins/marketplace/components/MarketplaceExtensionDetail.tsx

import { ShieldCheck, Star, Download } from 'lucide-react';
import type { MarketplaceExtension } from '../types';
import { MarketplaceInstallButton } from './MarketplaceInstallButton';
import { MarketplacePermissionPreview } from './MarketplacePermissionPreview';
import { MarketplaceReadme } from './MarketplaceReadme';
import {
  isMarketplaceExtensionInstalled,
  isMarketplaceExtensionEnabled,
} from '../services/marketplaceInstallStatus';

interface MarketplaceExtensionDetailProps {
  extension: MarketplaceExtension;
}

export function MarketplaceExtensionDetail(props: MarketplaceExtensionDetailProps) {
  const { extension } = props;
  const installed = isMarketplaceExtensionInstalled(extension.id);
  const enabled = isMarketplaceExtensionEnabled(extension.id);

  return (
    <div className="h-full overflow-auto">
      <div className="border-b p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted text-2xl font-semibold">
            {extension.displayName.slice(0, 1).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{extension.displayName}</h2>

              {extension.verified ? <ShieldCheck className="h-4 w-4 text-blue-500" /> : null}
            </div>

            <div className="mt-1 text-sm text-muted-foreground">
              {extension.id} · v{extension.version}
            </div>

            <p className="mt-3 text-sm text-muted-foreground">{extension.description}</p>

            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              {typeof extension.stats?.downloads === 'number' ? (
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  {extension.stats.downloads} downloads
                </span>
              ) : null}

              {typeof extension.stats?.rating === 'number' ? (
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {extension.stats.rating}
                </span>
              ) : null}

              {installed ? (
                <span className="text-green-600">
                  Installed · {enabled ? 'Enabled' : 'Disabled'}
                </span>
              ) : null}
            </div>
          </div>

          <MarketplaceInstallButton extension={extension} />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-4 p-5">
        <div>
          <MarketplaceReadme readme={extension.readme} />
        </div>

        <aside className="space-y-4">
          <section className="rounded-md border p-3">
            <h3 className="mb-2 text-sm font-medium">Categories</h3>
            <div className="flex flex-wrap gap-1">
              {extension.categories.map((category) => (
                <span key={category} className="rounded bg-muted px-2 py-1 text-xs">
                  {category}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-md border p-3">
            <h3 className="mb-2 text-sm font-medium">Tags</h3>
            <div className="flex flex-wrap gap-1">
              {extension.tags.map((tag) => (
                <span key={tag} className="rounded bg-muted px-2 py-1 text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <MarketplacePermissionPreview permissions={extension.permissions} />

          <section className="rounded-md border p-3 text-xs text-muted-foreground">
            <div>Publisher: {extension.publisher}</div>
            <div>Version: {extension.version}</div>
            {extension.license ? <div>License: {extension.license}</div> : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
```

---

# 19. MarketplacePermissionPreview

```tsx
// apps/desktop/src/plugins/marketplace/components/MarketplacePermissionPreview.tsx

import type { ExtensionPermission } from '@sqlgui/api';
import { PermissionList } from '@/plugins/permissions/components/PermissionList';

interface MarketplacePermissionPreviewProps {
  permissions: ExtensionPermission[];
}

export function MarketplacePermissionPreview(props: MarketplacePermissionPreviewProps) {
  return (
    <section className="rounded-md border p-3">
      <h3 className="mb-2 text-sm font-medium">Permissions</h3>

      <PermissionList permissions={props.permissions} />
    </section>
  );
}
```

---

# 20. MarketplaceReadme

MVP 不需要完整 Markdown renderer，可以先用 `pre` 或简单换行。
后续可以加 `react-markdown`。

```tsx
// apps/desktop/src/plugins/marketplace/components/MarketplaceReadme.tsx

interface MarketplaceReadmeProps {
  readme?: string;
}

export function MarketplaceReadme(props: MarketplaceReadmeProps) {
  if (!props.readme) {
    return (
      <div className="rounded-md border p-4 text-sm text-muted-foreground">No README provided.</div>
    );
  }

  return (
    <div className="rounded-md border p-4">
      <pre className="whitespace-pre-wrap text-sm leading-6">{props.readme}</pre>
    </div>
  );
}
```

想要更像市场页面，后续替换为：

```bash
pnpm --filter sqlgui-desktop add react-markdown remark-gfm
```

---

# 21. EmptyState

```tsx
// apps/desktop/src/plugins/marketplace/components/MarketplaceEmptyState.tsx

export function MarketplaceEmptyState() {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
      <div>
        <div className="font-medium text-foreground">No extensions found</div>
        <div className="mt-1">Try changing the search keyword or category.</div>
      </div>
    </div>
  );
}
```

---

# 22. Extensions 主页面整合

如果你已有 `ExtensionsView`，可以设计成 tabs。

```tsx
// apps/desktop/src/plugins/components/ExtensionsView.tsx

import { useState } from 'react';
import { MarketplaceView } from '../marketplace/components/MarketplaceView';
import { InstalledExtensionsView } from './InstalledExtensionsView';
import { ExtensionDevelopmentView } from './ExtensionDevelopmentView';
import { PluginLogsView } from './PluginLogsView';
import { PluginAuditView } from '../permissions/components/PluginAuditView';

type Tab = 'marketplace' | 'installed' | 'development' | 'logs' | 'audit';

export function ExtensionsView() {
  const [tab, setTab] = useState<Tab>('marketplace');

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 border-b text-sm">
        <TabButton active={tab === 'marketplace'} onClick={() => setTab('marketplace')}>
          Marketplace
        </TabButton>
        <TabButton active={tab === 'installed'} onClick={() => setTab('installed')}>
          Installed
        </TabButton>
        <TabButton active={tab === 'development'} onClick={() => setTab('development')}>
          Development
        </TabButton>
        <TabButton active={tab === 'logs'} onClick={() => setTab('logs')}>
          Logs
        </TabButton>
        <TabButton active={tab === 'audit'} onClick={() => setTab('audit')}>
          Audit
        </TabButton>
      </div>

      <div className="min-h-0 flex-1">
        {tab === 'marketplace' ? <MarketplaceView /> : null}
        {tab === 'installed' ? <InstalledExtensionsView /> : null}
        {tab === 'development' ? <ExtensionDevelopmentView /> : null}
        {tab === 'logs' ? <PluginLogsView /> : null}
        {tab === 'audit' ? <PluginAuditView /> : null}
      </div>
    </div>
  );
}

function TabButton(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className={[
        'border-r px-3 text-xs',
        props.active
          ? 'bg-background text-foreground'
          : 'bg-muted/40 text-muted-foreground hover:text-foreground',
      ].join(' ')}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}
```

---

# 23. CommandService 集成

新增核心命令：

```txt
extensions.openMarketplace
extensions.searchMarketplace
extensions.installSelectedMarketplaceExtension
extensions.refreshMarketplace
```

```ts
// apps/desktop/src/plugins/marketplace/registerMarketplaceCommands.ts

import { commandService } from '@/services/commandService';
import { useMarketplaceStore } from './store/marketplaceStore';
import { marketplaceInstallService } from './services/marketplaceInstallService';

export function registerMarketplaceCommands() {
  commandService.register({
    id: 'extensions.refreshMarketplace',
    title: 'Refresh Marketplace',
    category: 'Extensions',
    source: 'core',
    handler: async () => {
      await useMarketplaceStore.getState().load();
    },
  });

  commandService.register({
    id: 'extensions.installSelectedMarketplaceExtension',
    title: 'Install Selected Marketplace Extension',
    category: 'Extensions',
    source: 'core',
    handler: async () => {
      const extension = useMarketplaceStore.getState().getSelectedExtension();

      if (!extension) return;

      await marketplaceInstallService.install(extension);
    },
  });
}
```

后续 `extensions.openMarketplace` 需要和 Workbench view service 打通：

```ts
commandService.register({
  id: 'extensions.openMarketplace',
  title: 'Open Extensions Marketplace',
  category: 'Extensions',
  source: 'core',
  handler: async () => {
    workbenchService.openView('extensions.marketplace');
  },
});
```

---

# 24. 和 Phase 12 的安装链路关系

Phase 13 不自己安装文件，它只决定“安装哪个插件”。

```txt
MarketplaceInstallButton
  ↓
marketplaceInstallService.install(extension)
  ↓
解析 source
  ↓
extensionService.installFromPackage(packagePath)
  ↓
extensionInstallerService.installFromPackage
  ↓
Rust extension_install_from_package
  ↓
extensionService.reloadExtensions
```

这样后续真实市场只要替换：

```txt
localPackage -> remotePackage download -> local .sgx path
```

其余安装逻辑不用变。

---

# 25. Remote Package 预留设计

虽然 Phase 13 不做真实下载，但接口先留好。

```ts
// apps/desktop/src/plugins/marketplace/services/marketplaceDownloadService.ts

import type { MarketplaceExtension } from '../types';

export const marketplaceDownloadService = {
  async downloadPackage(extension: MarketplaceExtension): Promise<string> {
    if (extension.source.type !== 'remotePackage') {
      throw new Error('Extension source is not remote.');
    }

    // Phase 13 暂不实现
    // Phase 14/15 可以：
    // 1. fetch url
    // 2. 保存到 appData/extension-cache
    // 3. 校验 sha256
    // 4. 返回本地 packagePath

    throw new Error('Remote download is not implemented.');
  },
};
```

未来真实安装：

```ts
if (extension.source.type === 'remotePackage') {
  const packagePath = await marketplaceDownloadService.downloadPackage(extension);

  await extensionService.installFromPackage(packagePath);
}
```

---

# 26. Mock 插件包准备

为了让 Phase 13 真能安装，你需要准备几个 `.sgx`。

```bash
pnpm --filter sqlgui-extension-sql-formatter-demo build
pnpm sqlgui:pack extensions/sql-formatter-demo

pnpm --filter sqlgui-extension-explain-viewer-demo build
pnpm sqlgui:pack extensions/explain-viewer-demo

pnpm --filter sqlgui-extension-sql-snippets-demo build
pnpm sqlgui:pack extensions/sql-snippets-demo
```

输出：

```txt
dist-packages/
├─ baicie.sql-formatter-demo-0.1.0.sgx
├─ baicie.explain-viewer-demo-0.1.0.sgx
└─ baicie.sql-snippets-demo-0.1.0.sgx
```

---

# 27. 示例插件：SQL Snippets Demo

## 27.1 manifest

```json
{
  "name": "sql-snippets-demo",
  "displayName": "SQL Snippets Demo",
  "publisher": "baicie",
  "version": "0.1.0",
  "description": "Insert common SQL snippets into the active editor.",
  "main": "dist/extension.js",
  "activationEvents": ["onCommand:sqlSnippets.insertSelect"],
  "permissions": ["editor.write", "ui.notification"],
  "contributes": {
    "commands": [
      {
        "command": "sqlSnippets.insertSelect",
        "title": "Insert SELECT Snippet",
        "category": "SQL Snippets"
      }
    ],
    "menus": {
      "editor/context": [
        {
          "command": "sqlSnippets.insertSelect",
          "when": "editorLang == sql",
          "group": "snippets"
        }
      ]
    }
  }
}
```

## 27.2 extension.ts

```ts
import type { ExtensionContext, SqlGuiApi } from '@sqlgui/api';

export async function activate(api: SqlGuiApi, context: ExtensionContext) {
  context.subscriptions.push(
    api.commands.registerCommand('sqlSnippets.insertSelect', async () => {
      const editor = await api.editor.getActiveEditor();

      if (!editor) {
        await api.window.showWarningMessage('No active editor.');
        return;
      }

      await editor.insertText('SELECT *\nFROM table_name\nWHERE condition\nLIMIT 1000;');
    }),
  );
}

export function deactivate() {}
```

---

# 28. 示例插件：Explain Viewer Demo

## 28.1 manifest

```json
{
  "name": "explain-viewer-demo",
  "displayName": "Explain Viewer Demo",
  "publisher": "baicie",
  "version": "0.1.0",
  "description": "Run EXPLAIN for the current SQL.",
  "main": "dist/extension.js",
  "activationEvents": ["onCommand:explain.open"],
  "permissions": ["editor.read", "db.connection.read", "db.query.explain", "ui.notification"],
  "contributes": {
    "commands": [
      {
        "command": "explain.open",
        "title": "Open Explain Viewer",
        "category": "SQL"
      }
    ]
  }
}
```

## 28.2 extension.ts

```ts
import type { ExtensionContext, SqlGuiApi } from '@sqlgui/api';

export async function activate(api: SqlGuiApi, context: ExtensionContext) {
  context.subscriptions.push(
    api.commands.registerCommand('explain.open', async () => {
      const editor = await api.editor.getActiveEditor();

      if (!editor) {
        await api.window.showWarningMessage('No active editor.');
        return;
      }

      const connection = await api.db.getActiveConnection();

      if (!connection) {
        await api.window.showWarningMessage('No active connection.');
        return;
      }

      const sql = await editor.getSelectedTextOrDocumentText();

      if (!sql.trim()) {
        await api.window.showWarningMessage('SQL is empty.');
        return;
      }

      const result = await api.db.explain({
        connectionId: connection.id,
        sql,
      });

      await api.window.showInformationMessage(`EXPLAIN finished: ${result.rows.length} rows`);
    }),
  );
}

export function deactivate() {}
```

---

# 29. 安装失败 UI

当前 `MarketplaceInstallButton` 只是把错误放进 store。
详情页可以展示错误。

```tsx
// apps/desktop/src/plugins/marketplace/components/MarketplaceInstallError.tsx

import { useMarketplaceStore } from '../store/marketplaceStore';

export function MarketplaceInstallError(props: { extensionId: string }) {
  const installState = useMarketplaceStore((state) => state.installState[props.extensionId]);

  if (installState?.status !== 'failed') return null;

  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      {installState.error}
    </div>
  );
}
```

在 `MarketplaceExtensionDetail` 里加：

```tsx
<MarketplaceInstallError extensionId={extension.id} />
```

---

# 30. 市场数据刷新策略

Phase 13 mock 下：

```txt
刷新 = 重新读取 marketplace.mock.json
```

因为 JSON 是静态 import，运行时不会变。MVP 可以认为刷新只是重新过滤。

后续真实市场：

```txt
marketplaceService.refresh()
  ↓
fetch marketplace index
  ↓
cache marketplace index
  ↓
search local cache
```

建议现在保留方法：

```ts
async refresh() {
  // MVP no-op
  return this.search()
}
```

---

# 31. i18n 文案建议

`marketplace.json`：

```json
{
  "title": "插件市场",
  "description": "发现并安装 SQL GUI 插件。",
  "searchPlaceholder": "搜索插件...",
  "tabs": {
    "marketplace": "插件市场",
    "installed": "已安装",
    "development": "开发者",
    "logs": "日志",
    "audit": "审计"
  },
  "actions": {
    "install": "安装",
    "installing": "安装中...",
    "uninstall": "卸载",
    "enable": "启用",
    "disable": "禁用",
    "reload": "重载",
    "refresh": "刷新"
  },
  "status": {
    "installed": "已安装",
    "enabled": "已启用",
    "disabled": "已禁用",
    "failed": "安装失败"
  },
  "empty": {
    "title": "没有找到插件",
    "description": "尝试修改搜索关键词或分类。"
  },
  "detail": {
    "permissions": "权限",
    "categories": "分类",
    "tags": "标签",
    "publisher": "发布者",
    "version": "版本",
    "license": "许可证",
    "readme": "说明"
  }
}
```

英文同理。

---

# 32. Marketplace 与权限系统联动

安装按钮旁边要预览权限风险：

```txt
插件卡片：
Permissions: 3
Risk: medium/high/critical
```

可以计算最高风险：

```ts
// apps/desktop/src/plugins/marketplace/services/marketplaceRiskService.ts

import type { ExtensionPermission } from '@sqlgui/api';
import { getPermissionRisk } from '@/plugins/permissions/permissions';
import type { PermissionRiskLevel } from '@/plugins/permissions/types';

const order: Record<PermissionRiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function getMarketplaceExtensionRisk(
  permissions: ExtensionPermission[],
): PermissionRiskLevel {
  let max: PermissionRiskLevel = 'low';

  for (const permission of permissions) {
    const risk = getPermissionRisk(permission);

    if (order[risk] > order[max]) {
      max = risk;
    }
  }

  return max;
}
```

卡片展示：

```tsx
const risk = getMarketplaceExtensionRisk(extension.permissions)

<span className="text-xs text-muted-foreground">
  Risk: {risk}
</span>
```

---

# 33. Marketplace 数据校验

Mock 数据也要校验，避免市场页面挂掉。

```ts
// apps/desktop/src/plugins/marketplace/services/marketplaceValidator.ts

import type { MarketplaceExtension } from '../types';

export function validateMarketplaceExtension(
  extension: unknown,
): extension is MarketplaceExtension {
  if (!extension || typeof extension !== 'object') return false;

  const item = extension as MarketplaceExtension;

  if (!item.id) return false;
  if (!item.name) return false;
  if (!item.publisher) return false;
  if (!item.version) return false;
  if (!item.displayName) return false;
  if (!item.source) return false;

  return true;
}

export function validateMarketplaceExtensions(extensions: unknown[]) {
  return extensions.filter(validateMarketplaceExtension);
}
```

在 service 里使用：

```ts
import { validateMarketplaceExtensions } from './marketplaceValidator'

private extensions = validateMarketplaceExtensions(
  mockExtensions as unknown[],
)
```

---

# 34. Phase 13 开发顺序

```txt
1. 定义 marketplace/types.ts
2. 创建 marketplace.mock.json
3. 实现 marketplaceService.search/getById
4. 实现 marketplaceStore
5. 实现 MarketplaceView 布局
6. 实现 MarketplaceHeader/Search/CategoryTabs
7. 实现 MarketplaceExtensionList/Card
8. 实现 MarketplaceExtensionDetail
9. 实现 MarketplacePermissionPreview
10. 实现 MarketplaceInstallButton
11. 实现 marketplaceSourceResolver
12. 实现 Rust marketplace_resolve_local_package
13. 实现 marketplaceInstallService
14. 和 extensionService.installFromPackage 打通
15. 整合 ExtensionsView tabs
16. 添加 install error UI
17. 添加 registerMarketplaceCommands
18. 准备 demo .sgx 包
19. 手动安装/卸载验证
20. 补 i18n 文案
```

---

# 35. 测试用例

## 35.1 单元测试

```txt
[ ] marketplaceService.search 空条件返回全部
[ ] marketplaceService.search query 能过滤
[ ] marketplaceService.search category 能过滤
[ ] sortBy downloads 正确排序
[ ] sortBy name 正确排序
[ ] marketplaceStore.setQuery 会触发 load
[ ] getMarketplaceExtensionRisk 能返回最高风险
[ ] validateMarketplaceExtension 能过滤非法数据
```

## 35.2 手动测试

```txt
[ ] 打开 Extensions -> Marketplace
[ ] 能看到 mock 插件列表
[ ] 搜索 formatter 能看到 SQL Formatter
[ ] 切换 Formatter 分类能过滤
[ ] 点击插件卡片能显示详情
[ ] 详情页能看到 README
[ ] 详情页能看到 permissions
[ ] 点击 Install 能安装 .sgx
[ ] 安装后按钮变成 Disable / Uninstall
[ ] Command Palette 出现插件命令
[ ] 执行插件命令正常
[ ] 点击 Disable 后插件命令消失
[ ] 点击 Enable 后插件命令恢复
[ ] 点击 Uninstall 后插件从已安装状态恢复为 Install
[ ] 安装失败时显示错误
```

---

# 36. Phase 13 完成标准

```txt
[ ] Marketplace mock 数据完成
[ ] MarketplaceService 可搜索/过滤/排序
[ ] Marketplace 页面完成
[ ] 插件详情页完成
[ ] 权限预览完成
[ ] README 展示完成
[ ] Install Button 状态正确
[ ] localPackage 安装链路跑通
[ ] marketplace_resolve_local_package 可用
[ ] 安装后 extensionService.reloadExtensions 生效
[ ] 卸载后市场状态更新
[ ] Installed / Marketplace 状态联动
[ ] 命令系统集成完成
[ ] 至少 2-3 个 demo 插件可从市场安装
```

---

# 37. 最小闭环

Phase 13 最小闭环：

```txt
准备 baicie.sql-formatter-demo-0.1.0.sgx
  ↓
marketplace.mock.json 配置 localPackage
  ↓
打开 Marketplace
  ↓
点击 SQL Formatter Demo
  ↓
点击 Install
  ↓
marketplaceInstallService.install
  ↓
extensionService.installFromPackage
  ↓
Rust extension_install_from_package
  ↓
reloadExtensions
  ↓
Command Palette 出现 Format SQL
  ↓
执行 Format SQL 成功
  ↓
回到 Marketplace
  ↓
按钮显示 Disable / Uninstall
```

---

# 38. Phase 13 的核心价值

Phase 13 做完以后，你的插件系统就具备了产品形态：

```txt
之前：
只能手动加载本地插件

现在：
用户可以在 UI 里搜索、查看、安装、卸载插件
```

虽然还是 mock marketplace，但架构已经和真实市场很接近：

```txt
marketplaceService
  ↓
marketplace index
  ↓
extension package source
  ↓
extensionInstallerService
  ↓
local install
```

后续要做真实市场，只需要替换两块：

```txt
1. marketplace.mock.json
   ↓
   remote marketplace index API

2. localPackage source
   ↓
   remotePackage download + sha256 check
```

其他 UI、权限展示、安装链路、卸载链路都能复用。
