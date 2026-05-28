# UI 系统重构计划

## 现状

### `@sqlgui/ui` 包现状

当前 `packages/ui/src/` 仅有一个内联样式的 `Button` 组件，距离 shadcn/ui 风格体系的设计目标差距很大。

```
packages/ui/src/
└── index.tsx   # 仅导出 1 个组件：Button（内联样式）
```

需要建设的基础组件清单：

| 组件                | 状态   | 依赖                                     |
| ------------------- | ------ | ---------------------------------------- |
| Button / IconButton | 需重构 | class-variance-authority                 |
| Input               | 需新建 | -                                        |
| Textarea            | 需新建 | -                                        |
| Label               | 需新建 | -                                        |
| Select              | 需新建 | @radix-ui/react-select                   |
| Checkbox            | 需新建 | @radix-ui/react-checkbox                 |
| Radio               | 需新建 | @radix-ui/react-radio-group              |
| Switch              | 需新建 | @radix-ui/react-switch                   |
| Dialog              | 需新建 | @radix-ui/react-dialog                   |
| Drawer              | 需新建 | @radix-ui/react-dialog（用 dialog mode） |
| Popover             | 需新建 | @radix-ui/react-popover                  |
| Tooltip             | 需新建 | @radix-ui/react-tooltip                  |
| DropdownMenu        | 需新建 | @radix-ui/react-dropdown-menu            |
| Tabs                | 需新建 | @radix-ui/react-tabs                     |
| Badge               | 需新建 | -                                        |
| Separator           | 需新建 | @radix-ui/react-separator                |
| ScrollArea          | 需新建 | @radix-ui/react-scroll-area              |
| EmptyState          | 需新建 | -                                        |
| Toolbar             | 需新建 | -                                        |
| Tree                | 需新建 | -                                        |
| DataGrid            | 需新建 | @tanstack/react-table                    |

### 业务代码 H5 元素使用现状

共涉及 **18 个文件**，约 **58 个原始 H5 控件**散落在业务代码中。

#### 按优先级排序

**P0 — 立即处理（高密度表单/对话框）**

| 文件                                         | button | input | select | option | 说明                        |
| -------------------------------------------- | -----: | ----- | -----: | -----: | --------------------------- |
| `workbench/connections/ConnectionDialog.tsx` |      3 | 7     |      1 |      3 | 连接配置表单，H5 控件最密集 |
| `workbench/views/SettingsView.tsx`           |      - | -     |      2 |      5 | 设置页，主题/语言下拉       |

**P1 — 高优先级（工具栏/命令面板）**

| 文件                                          | button | input | select | option | 说明                           |
| --------------------------------------------- | -----: | ----- | -----: | -----: | ------------------------------ |
| `workbench/command/CommandPalette.tsx`        |    ~10 | 1     |      - |      - | 命令面板，每条命令 1 个 button |
| `workbench/menu/MenuButton.tsx`               |      2 | -     |      - |      - | 菜单按钮，含下拉 item          |
| `workbench/connections/ContextMenu.tsx`       |     ~5 | -     |      - |      - | 右键菜单，每项 1 个 button     |
| `workbench/results/components/ResultGrid.tsx` |      3 | -     |      - |      - | 结果面板 toolbar               |

**P2 — 中优先级（编辑器/树/面板）**

| 文件                                                 | button | input | select | option | 说明          |
| ---------------------------------------------------- | -----: | ----- | -----: | -----: | ------------- |
| `workbench/editor/components/EditorToolbar.tsx`      |      2 | -     |      - |      - | 编辑器工具栏  |
| `workbench/editor/components/ConnectionSelector.tsx` |      - | -     |      1 |     ~3 | 连接选择器    |
| `workbench/layout/BottomPanel.tsx`                   |      1 | -     |      - |      - | 底部面板      |
| `workbench/connections/ConnectionsTree.tsx`          |      1 | -     |      - |      - | 展开/折叠按钮 |

**P3 — 低优先级（插件系统）**

| 文件                                                           | button | input | select | option | 说明          |
| -------------------------------------------------------------- | -----: | ----- | -----: | -----: | ------------- |
| `plugins/marketplace/components/MarketplaceInstallButton.tsx`  |      4 | -     |      - |      - | 安装按钮组    |
| `plugins/permissions/components/PermissionGrantDialog.tsx`     |      2 | -     |      - |      - | 权限弹窗      |
| `plugins/permissions/components/DangerousSqlConfirmDialog.tsx` |      2 | -     |      - |      - | 危险 SQL 确认 |
| `plugins/security/components/UnsignedInstallWarningDialog.tsx` |      2 | -     |      - |      - | 未签名警告    |
| `plugins/security/components/TrustPublisherDialog.tsx`         |      2 | -     |      - |      - | 信任发布者    |
| `plugins/security/components/SignatureInvalidDialog.tsx`       |      1 | -     |      - |      - | 签名无效      |
| `plugins/marketplace/components/MarketplaceHeader.tsx`         |      - | -     |      1 |      4 | 市场筛选      |
| `plugins/marketplace/components/MarketplaceSearch.tsx`         |      - | 1     |      - |      - | 市场搜索框    |

---

## 重构目标

### 组件分层

```
@sqlgui/ui               # 基础组件（shadcn/ui 风格）
  ├── Button / IconButton
  ├── Input / Textarea
  ├── Label
  ├── Select
  ├── Dialog
  ├── DropdownMenu / Popover / Tooltip
  ├── Tabs
  ├── Badge / Separator / ScrollArea
  ├── EmptyState
  └── cn.ts (clsx + tailwind-merge)

apps/desktop/src/        # 业务组件（使用 @sqlgui/ui）
  ├── workbench/
  │   ├── connections/
  │   ├── editor/
  │   ├── results/
  │   ├── layout/
  │   ├── command/
  │   └── views/
  └── plugins/
```

### 代码质量标准

改完后，`apps/desktop/src/**/*.tsx` 中：

- **允许**：`div`、`section`、`main`、`header`、`footer`、`aside`、`span`、`p`、`pre`、`code`、`ul`、`li`
- **禁止**：`button`、`input`、`textarea`、`select`、`option`、`dialog`

### ESLint 约束

`eslint.config.js` 已配置 `react/forbid-elements` 为 `error` 级别，确保后续不会回退。

---

## 重构阶段

### 阶段一：建设 `@sqlgui/ui` 基础组件

按依赖关系分批实现：

**批次 A（无 Radix 依赖）**

- [ ] `cn.ts` — clsx + tailwind-merge 合并工具
- [ ] `button.tsx` — cva 变体按钮，含 variant/size
- [ ] `badge.tsx` — 徽章组件
- [ ] `separator.tsx` — 分隔线

**批次 B（基础表单）**

- [ ] `input.tsx` — 标准输入框
- [ ] `textarea.tsx` — 多行文本
- [ ] `label.tsx` — 表单标签

**批次 C（Radix 核心）**

- [ ] `select.tsx` — 下拉选择（依赖 @radix-ui/react-select）
- [ ] `dialog.tsx` — 对话框（依赖 @radix-ui/react-dialog）
- [ ] `tabs.tsx` — 标签页（依赖 @radix-ui/react-tabs）
- [ ] `scroll-area.tsx` — 滚动区域（依赖 @radix-ui/react-scroll-area）

**批次 D（高级交互）**

- [ ] `dropdown-menu.tsx`（依赖 @radix-ui/react-dropdown-menu）
- [ ] `popover.tsx`（依赖 @radix-ui/react-popover）
- [ ] `tooltip.tsx`（依赖 @radix-ui/react-tooltip）
- [ ] `checkbox.tsx`（依赖 @radix-ui/react-checkbox）
- [ ] `radio.tsx`（依赖 @radix-ui/react-radio-group）
- [ ] `switch.tsx`（依赖 @radix-ui/react-switch）

**批次 E（SQL GUI 专用）**

- [ ] `empty-state.tsx` — 空状态
- [ ] `toolbar.tsx` — 工具栏
- [ ] `tree.tsx` — 树形组件
- [ ] `data-grid.tsx` — 数据表格（依赖 @tanstack/react-table）

### 阶段二：替换高频业务文件

**第一轮（P0）**

- [ ] `ConnectionDialog.tsx` — 替换 input/select/button
- [ ] `SettingsView.tsx` — 替换 select/option

**第二轮（P1）**

- [ ] `CommandPalette.tsx` — 替换 input/button
- [ ] `MenuButton.tsx` — 替换 button
- [ ] `ContextMenu.tsx` — 替换 button
- [ ] `ResultGrid.tsx` — 替换 button

**第三轮（P2）**

- [x] `EditorToolbar.tsx` — 替换 button
- [ ] `ConnectionSelector.tsx` — 替换 select/option
- [x] `BottomPanel.tsx` — 替换 button
- [ ] `ConnectionsTree.tsx` — 替换 button

**第四轮（P3）**

- [ ] 全部插件目录下的 dialog/button

### 阶段三：SQL GUI 专用组件

在 `@sqlgui/ui` 中新增 SQL GUI 业务通用组件：

- [ ] `ConnectionKindSelect` — 连接类型选择（SQLite/PostgreSQL/MySQL）
- [ ] `SqlguiToolbar` — 工作台工具栏
- [ ] `SqlguiTreeItem` — 树节点
- [ ] `SqlguiEmptyState` — 统一空状态
- [ ] `SqlguiStatusBadge` — 状态徽章（Connected/Disconnected/Error）

---

## 禁止的做法

```tsx
// ❌ 禁止：直接在业务代码中使用原始 H5 标签
<button className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent" />
<input className="w-full rounded-md border bg-background px-2 py-1.5 text-sm" />
<select className="w-full rounded-md border bg-background px-2 py-1.5 text-sm" />
```

```tsx
// ✅ 正确：通过 @sqlgui/ui 使用
import { Button, Input, Select, Dialog } from '@sqlgui/ui';
```

```tsx
// ❌ 禁止：复制 shadcn 组件到业务目录
apps / desktop / src / components / button.tsx; // 不应该存在
apps / desktop / src / components / dialog.tsx; // 不应该存在
```

---

## 注意事项

1. **先建组件，再改业务**：`@sqlgui/ui` 缺什么组件，先补充组件，再改业务文件
2. **不要全量重构**：MVP 功能还未完全稳定，分批次逐文件替换
3. **保持 props 接口稳定**：新增公共 UI 组件必须写 `interface` 和 JSDoc
4. **同步更新导出**：`packages/ui/src/index.ts` 需同步新增导出
5. **每个组件独立 PR**：方便 Code Review 和回滚
6. **插件目录同标准**：`apps/desktop/src/plugins/**` 也受相同约束
