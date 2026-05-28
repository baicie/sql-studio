是的，这个问题要现在处理，而且应该升为 **v0.1 前的 P0.5 工程治理任务**。

你最初设想是：

```txt
@sqlgui/ui 负责基础组件 / 设计系统
apps/desktop 只负责业务组合
```

但现在实际代码里，`@sqlgui/desktop` 虽然已经依赖了 `@sqlgui/ui`，但业务组件里还大量直接写 `input`、`select`、`button`、`div`、`pre` 等原始标签。

比如 `ConnectionDialog` 里表单控件基本都是原始 `input/select/button`。
`ResultGrid` 里 toolbar、button、grid cell 也都是手写 className。

这会导致三个问题：

1. **样式不统一**：每个地方都在写 border、px、text-sm、hover。
2. **代码臃肿**：业务逻辑和 UI 细节混在一起。
3. **后期改主题成本高**：暗色、浅色、紧凑模式、插件 UI 都很难统一。

---

# 结论

你现在应该马上做一次：

```txt
UI System Refactor
```

目标不是一次性把 UI 做多漂亮，而是先把组件体系扶正。

也就是：

> 先把“原始 H5 标签散落在业务代码里”的问题解决，再继续做样式优化。

---

# 正确分层应该是这样

## 1. `@sqlgui/ui`：只放通用 UI 组件

比如：

```txt
packages/ui/src/
  components/
    button.tsx
    input.tsx
    textarea.tsx
    select.tsx
    dialog.tsx
    dropdown-menu.tsx
    tabs.tsx
    badge.tsx
    tooltip.tsx
    scroll-area.tsx
    separator.tsx
    form.tsx
    empty-state.tsx
    toolbar.tsx
    icon-button.tsx
    data-grid.tsx
    tree.tsx
  styles/
    globals.css
  lib/
    cn.ts
  index.ts
```

这些组件应该基于 shadcn/ui 改造，而不是自己随便写。

---

## 2. `apps/desktop`：只放业务组件

比如：

```txt
apps/desktop/src/workbench/connections/
  ConnectionDialog.tsx
  ConnectionsTree.tsx

apps/desktop/src/workbench/results/
  ResultGrid.tsx

apps/desktop/src/workbench/editor/
  SqlEditor.tsx
```

这些业务组件可以使用：

```ts
import { Button, Input, Select, Dialog } from '@sqlgui/ui';
```

但不要再直接写：

```tsx
<button className="..." />
<input className="..." />
<select className="..." />
```

---

# 不是所有原始标签都要禁止

要分清楚。

## 可以保留的原始标签

这些可以保留：

```tsx
<div />
<section />
main />
header />
span />
pre />
code />
```

因为它们主要承担布局或语义。

## 应该禁止直接使用的原始标签

这些应该迁移到 `@sqlgui/ui`：

```tsx
button
input
textarea
select
dialog
label
checkbox
radio
switch
tabs
dropdown
popover
tooltip
table
```

尤其是：

```txt
button / input / select / dialog
```

必须尽快统一。

---

# 推荐迁移顺序

## 第一阶段：先建基础组件

先在 `@sqlgui/ui` 建这些：

```txt
Button
IconButton
Input
Label
Select
Textarea
Dialog
Badge
Tabs
DropdownMenu
Tooltip
Separator
ScrollArea
EmptyState
Toolbar
```

这一步不碰业务逻辑，只建立组件出口。

---

## 第二阶段：替换高频原始标签

先替换这几个文件：

```txt
ConnectionDialog.tsx
EditorToolbar.tsx
BottomPanel.tsx
ResultGrid.tsx
ConnectionsTree.tsx
CommandPalette.tsx
SettingsView.tsx
```

因为它们是 UI 密度最高的地方。

---

## 第三阶段：抽 SQL GUI 专用组件

除了 shadcn 基础组件，还需要你自己的业务通用组件：

```txt
ConnectionKindSelect
SqlguiDialog
SqlguiToolbar
SqlguiPanel
SqlguiTree
SqlguiTreeItem
SqlguiDataGrid
SqlguiEmptyState
SqlguiStatusBadge
```

这些可以继续放 `@sqlgui/ui`，也可以拆成：

```txt
@sqlgui/ui              基础组件
@sqlgui/workbench-ui    工作台组件
```

但 MVP 阶段建议先都放 `@sqlgui/ui`，别拆太细。

---

# 具体怎么改

## 1. `@sqlgui/ui` 暴露 Button

```tsx
// packages/ui/src/components/button.tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:opacity-90',
        outline: 'border bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
      },
      size: {
        sm: 'h-7 px-2 text-xs',
        md: 'h-8 px-3',
        lg: 'h-9 px-4',
        icon: 'h-7 w-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  },
);

Button.displayName = 'Button';
```

---

## 2. `@sqlgui/ui` 暴露 Input

```tsx
// packages/ui/src/components/input.tsx
import * as React from 'react';
import { cn } from '../lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'h-8 w-full rounded-md border bg-background px-2 text-sm outline-none',
          'placeholder:text-muted-foreground',
          'focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
```

---

## 3. `@sqlgui/ui` 统一出口

```ts
// packages/ui/src/index.ts
export * from './components/button';
export * from './components/input';
export * from './components/label';
export * from './components/select';
export * from './components/dialog';
export * from './components/badge';
export * from './components/tabs';
export * from './components/toolbar';
export * from './components/empty-state';
export * from './lib/cn';
```

---

# 以 `ConnectionDialog` 为例

现在它的问题是：

```tsx
<input className="w-full rounded-md border bg-background px-2 py-1.5 text-sm" />
<select className="w-full rounded-md border bg-background px-2 py-1.5 text-sm" />
<button className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent" />
```

应该改成：

```tsx
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@sqlgui/ui';
```

业务代码就会变成：

```tsx
<Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>{mode === 'edit' ? t('editConnection') : t('newConnection')}</DialogTitle>
      <DialogDescription>{t('message.passwordInsecure')}</DialogDescription>
    </DialogHeader>

    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>{t('fields.name')}</Label>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('fields.name')}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('fields.type')}</Label>
        <Select value={kind} onValueChange={(value) => setKind(value as DbKind)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SQLite">{t('dbKind.sqlite')}</SelectItem>
            <SelectItem value="PostgreSQL">{t('dbKind.postgres')}</SelectItem>
            <SelectItem value="MySQL">{t('dbKind.mysql')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={onClose}>
        {tc('actions.cancel')}
      </Button>
      <Button variant="outline" onClick={handleTest}>
        {loading ? tc('status.loading') : t('testConnection')}
      </Button>
      <Button onClick={handleSaveAndConnect}>
        {loading ? tc('status.loading') : tc('actions.save')}
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

这样业务代码会短很多，而且样式统一。

---

# 建议加一个 ESLint 规则

为了防止以后又写回原始标签，可以加规则。

先简单做一个约定：

```txt
apps/desktop 中禁止直接使用：
button/input/select/textarea

例外：
packages/ui 可以使用
```

可以用 `eslint-plugin-react` 的 `forbid-elements` 思路，或者自己写一个简单 rule。

配置思路：

```js
// eslint.config.js
{
  files: ['apps/desktop/src/**/*.{ts,tsx}'],
  rules: {
    'react/forbid-elements': [
      'warn',
      {
        forbid: [
          { element: 'button', message: 'Use Button from @sqlgui/ui instead.' },
          { element: 'input', message: 'Use Input from @sqlgui/ui instead.' },
          { element: 'select', message: 'Use Select from @sqlgui/ui instead.' },
          { element: 'textarea', message: 'Use Textarea from @sqlgui/ui instead.' },
        ],
      },
    ],
  },
}
```

如果插件不兼容当前 ESLint 版本，后面可以自己写一个小 rule。

---

# 什么时候做？

我建议现在立刻做，而且放在 MVP 前。

路线图调整成：

```txt
P0：修核心功能
  - 查询结果模型
  - DML affected rows
  - SQLite 文件选择
  - Schema Tree 层级
  - Query History

P0.5：UI System Refactor
  - shadcn 组件落到 @sqlgui/ui
  - 替换原始 button/input/select/dialog
  - 建立统一 Button/Input/Dialog/Select/Tabs/Toolbar
  - 加 ESLint 限制

P1：UI Polish
  - 工作台视觉优化
  - ResultGrid 美化
  - Tree 美化
  - Dialog 美化

P2：高级体验
  - 主题系统
  - 自定义布局
  - 表格列拖拽
  - 更好的空状态
```

---

# 不建议怎么做

不要一上来全量重构所有文件。
你现在功能还没完全稳定，全量重构风险大。

更好的方式是：

```txt
先组件化高频控件
再替换最丑、最臃肿的几个页面
最后加 lint 防回退
```

优先顺序：

```txt
1. packages/ui 基础组件
2. ConnectionDialog
3. EditorToolbar
4. ResultGrid Toolbar
5. BottomPanel
6. ConnectionsTree
7. CommandPalette
8. SettingsView
```

---

# 最终标准

改完以后，`apps/desktop` 里的代码应该长这样：

```tsx
import { Button, Input, Select, Dialog, Toolbar, EmptyState } from '@sqlgui/ui';
```

而不是到处写：

```tsx
<button className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent" />
<input className="w-full rounded-md border bg-background px-2 py-1.5 text-sm" />
```

一句话：

> 现在先别继续堆功能，先把 `@sqlgui/ui` 真正用起来。否则后面 UI 会越来越难救。
