可以，建议直接在 `AGENTS.md` 增加一个 **UI 设计系统约束** 章节。你现在的 `AGENTS.md` 已经有“代码风格指南”“代码检查规则”“AI 助手使用规范”等内容，适合把这类限制写成强规则，而不是口头约定。

建议加在 **“代码风格指南” -> “代码组织”** 后面，或者 **“代码检查规则”** 前面。

````md
## UI 设计系统约束

### 基本原则

SQL GUI 的 UI 必须遵循统一设计系统，禁止在业务代码中随意手写基础控件样式。

- `@sqlgui/ui` 是项目唯一的基础 UI 组件来源
- `apps/desktop` 只负责业务组合，不应重复实现基础 UI 组件
- 所有通用交互组件应优先沉淀到 `packages/ui`
- 业务组件中不得大量堆叠 Tailwind class 来模拟基础组件
- 新增 UI 时应优先检查 `@sqlgui/ui` 是否已有对应组件

### 组件分层规则

#### `packages/ui` 负责

以下组件必须放在 `@sqlgui/ui` 中统一维护：

- Button
- IconButton
- Input
- Textarea
- Label
- Select
- Checkbox
- Radio
- Switch
- Dialog
- Drawer
- Popover
- Tooltip
- DropdownMenu
- Tabs
- Badge
- Separator
- ScrollArea
- EmptyState
- Toolbar
- Tree
- DataGrid

#### `apps/desktop` 负责

`apps/desktop` 中只允许编写业务组件，例如：

- ConnectionDialog
- ConnectionsTree
- SqlEditor
- EditorToolbar
- ResultPanel
- SettingsView
- ExtensionView

这些业务组件必须通过 `@sqlgui/ui` 使用基础组件。

推荐写法：

```tsx
import { Button, Input, Label, Select } from '@sqlgui/ui';
```
````

禁止写法：

```tsx
<button className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent" />
<input className="w-full rounded-md border bg-background px-2 py-1.5 text-sm" />
<select className="w-full rounded-md border bg-background px-2 py-1.5 text-sm" />
```

### 原始 H5 标签使用限制

#### 禁止直接使用

在 `apps/desktop/src/**/*.{ts,tsx}` 中，默认禁止直接使用以下原始标签：

- `button`
- `input`
- `textarea`
- `select`
- `option`
- `dialog`

必须改用 `@sqlgui/ui` 中的对应组件。

#### 可以直接使用

以下语义或布局标签可以继续直接使用：

- `div`
- `section`
- `main`
- `header`
- `footer`
- `aside`
- `span`
- `p`
- `pre`
- `code`
- `ul`
- `li`

但如果某段布局反复出现，应抽象为 `@sqlgui/ui` 或业务组件。

### 样式约束

业务代码中禁止重复手写以下样式组合：

```tsx
className = 'rounded-md border px-3 py-1.5 text-sm hover:bg-accent';
className = 'w-full rounded-md border bg-background px-2 py-1.5 text-sm';
className = 'flex items-center gap-1 rounded px-1.5 py-0.5 text-xs';
```

这类样式必须沉淀为：

- `Button`
- `IconButton`
- `Input`
- `ToolbarButton`
- `TreeItem`
- `PanelHeader`
- `EmptyState`

### shadcn/ui 使用规则

项目采用 shadcn/ui 风格体系，但不允许在业务代码中分散维护 shadcn 组件。

正确方式：

1. 在 `packages/ui/src/components` 中封装 shadcn 风格组件
2. 从 `packages/ui/src/index.ts` 统一导出
3. 在 `apps/desktop` 中通过 `@sqlgui/ui` 引用

禁止在 `apps/desktop` 中直接复制 shadcn 组件实现。

### 新增 UI 组件流程

新增 UI 时必须按以下顺序判断：

1. `@sqlgui/ui` 是否已有组件
2. 是否可以组合已有组件实现
3. 是否具备通用性，能否沉淀到 `@sqlgui/ui`
4. 如果只是业务特定组件，才允许放在 `apps/desktop`

### 重构要求

如果修改以下文件，应优先清理原始 H5 控件：

- `apps/desktop/src/workbench/connections/ConnectionDialog.tsx`
- `apps/desktop/src/workbench/editor/components/EditorToolbar.tsx`
- `apps/desktop/src/workbench/layout/BottomPanel.tsx`
- `apps/desktop/src/workbench/results/components/ResultGrid.tsx`
- `apps/desktop/src/workbench/connections/ConnectionsTree.tsx`
- `apps/desktop/src/workbench/command/CommandPalette.tsx`
- `apps/desktop/src/workbench/views/SettingsView.tsx`

### ESLint 约束要求

项目应增加 ESLint 规则，限制业务代码直接使用基础 H5 控件。

建议规则：

```js
{
  files: ['apps/desktop/src/**/*.{ts,tsx}'],
  rules: {
    'react/forbid-elements': [
      'warn',
      {
        forbid: [
          { element: 'button', message: 'Use Button from @sqlgui/ui instead.' },
          { element: 'input', message: 'Use Input from @sqlgui/ui instead.' },
          { element: 'textarea', message: 'Use Textarea from @sqlgui/ui instead.' },
          { element: 'select', message: 'Use Select from @sqlgui/ui instead.' },
          { element: 'option', message: 'Use SelectItem from @sqlgui/ui instead.' },
          { element: 'dialog', message: 'Use Dialog from @sqlgui/ui instead.' }
        ]
      }
    ]
  }
}
```

如果当前 ESLint 插件不支持该规则，应新增自定义 lint rule 或脚本检查。

### AI 助手约束

AI 助手在修改 UI 相关代码时必须遵守：

- 不允许在 `apps/desktop` 中新增原始 `button/input/select/textarea/dialog`
- 不允许复制粘贴重复 Tailwind 样式
- 优先复用 `@sqlgui/ui`
- 如果 `@sqlgui/ui` 缺组件，应先补充 UI 包组件，再修改业务组件
- 修改 UI 时应同步更新相关导出文件
- 新增公共 UI 组件必须补充 props 类型和必要注释

```

另外你这个文件里项目结构还是旧的 `full-monorepo`、`web/backend/mobile/miniprogram/browser-ext` 模板说明，和现在 `mvp` 分支实际已经收敛到 SQL GUI Desktop/Rust DB Core 不一致。建议顺手把项目背景和结构也改掉，不然 AI 后续会继续按旧模板理解项目。
```
