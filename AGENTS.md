# AGENTS.md

## 项目背景

这是一个基于 Tauri 2 + React 的桌面 SQL GUI 应用（SQL Studio），支持 SQLite、PostgreSQL、MySQL 三种数据库的连接、查询、结果展示和插件扩展。

核心技术栈：

- **桌面壳**：Tauri 2 + Vite
- **前端**：React + TypeScript + shadcn/ui
- **后端 DB Core**：Rust + sqlx
- **编辑器**：Monaco Editor
- **状态管理**：Zustand
- **国际化**：i18n
- **插件系统**：自定义 manifest + sandboxed iframe

项目采用 pnpm workspace monorepo 架构，包含 TypeScript 应用层、Rust crate 层和插件扩展层。

## 项目结构

```
sql-studio/
├── apps/                      # 应用程序
│   └── desktop/               # Tauri 桌面应用
│       ├── src/               # React 前端源码
│       └── src-tauri/         # Rust Tauri 后端
├── packages/                  # 共享包（TypeScript）
│   ├── ui/                    # 基础 UI 组件包（shadcn/ui 风格）
│   ├── utils/                 # 工具函数包
│   ├── i18n/                  # 国际化资源包
│   ├── sqlgui-api/            # SQL GUI 公共 API 类型定义
│   ├── sqlgui-sdk/            # SQL GUI SDK（前端调用层）
│   ├── extension-schema/      # 插件 manifest JSON Schema
│   └── tsconfig/              # TypeScript 配置包
├── crates/                    # Rust crate（DB Core）
│   ├── sqlgui-db/             # 数据库连接与查询
│   ├── sqlgui-common/         # 公共类型与工具
│   ├── sqlgui-extension/      # 插件运行时
│   └── sqlgui-marketplace/    # 插件市场
├── extensions/               # 内置插件源码
├── templates/                 # 插件开发模板
└── pnpm-workspace.yaml        # Workspace 配置
```

## AI助手使用规范

### 语言要求

- **所有回复都使用中文**：在与用户交互时，始终使用中文进行回复和说明

### 文档维护要求

在每次完成阶段性工作后，**必须及时更新相关文档**，包括但不限于：

- **`docs/todo.md`**：Phase 验收标准完成后，将 `[ ]` 更新为 `[x]`，更新进度总览表格为 ✅ 完成
- **`docs/desgin/*.md`**：Phase 设计文档如有实现差异，及时同步文档
- **`AGENTS.md`**：如果新增了规范要求，及时补充到 AGENTS.md 中
- **接口注释**：新增或修改的公共 API 应补充 JSDoc 注释

> **原则**：代码和文档必须保持同步。不允许出现代码已实现但文档未更新的情况。

## 安装和设置

### 开发环境要求

- Node.js 版本 >= 18.12.0
- pnpm 版本 >= 10.19.0
- Rust 版本 >= 1.75.0（含 cargo）
- 推荐使用支持 TypeScript 的编辑器（如 VS Code）

### 安装依赖

```bash
pnpm install
```

### 开发命令

```bash
pnpm dev          # 开发模式（Tauri desktop dev）
pnpm build        # 构建所有包和应用
pnpm lint         # 代码检查
pnpm check        # TypeScript 检查 + Rust workspace 检查
```

> **注意**：项目未配置测试框架（Vitest），如需添加测试请自行配置。

## 代码风格指南

### 基本编码规范

- 使用 TypeScript 严格模式
- 使用 ES modules（`import`/`export`）
- 使用 2 空格缩进
- 使用 LF 换行符
- 避免使用 `any` 类型，尽可能精确地定义类型
- 使用接口（interface）而非类型别名（type alias）定义对象结构
- 导出所有公共接口类型，方便用户使用

### 设计原则

在代码设计和实现过程中，应遵循以下核心原则：

- **第一性原理**：在进行代码设计规划时，从问题的本质出发，避免过度依赖既有方案，深入思考最优解决方案
- **KISS原则**（Keep It Simple, Stupid）：在代码实现时，优先选择简单直接的方案，避免不必要的复杂性
- **SOLID原则**：
  - **单一职责原则**（Single Responsibility Principle）：每个类或函数只负责一个功能
  - **开闭原则**（Open-Closed Principle）：对扩展开放，对修改关闭
  - **里氏替换原则**（Liskov Substitution Principle）：子类可以替换父类
  - **接口隔离原则**（Interface Segregation Principle）：使用多个专门的接口，而不是单一的总接口
  - **依赖倒置原则**（Dependency Inversion Principle）：依赖抽象而不是具体实现
- **代码复用**：尽量复用已有代码，避免重复代码（DRY原则：Don't Repeat Yourself）
- **架构一致性**：遵循项目既定的架构设计，保持代码风格一致
- **单一职责变更**：代码修改遵循单一职责原则，不混合多个变更，每次修改只解决一个问题

### 语法限制

项目中以下语法应避免使用：

- **对象展开运算符**：使用 `extend` helper 函数替代
- **const enum**：使用非 const enum

### 命名规范

- 文件名使用 kebab-case（短横线连接）
- 变量和函数名使用 camelCase（小驼峰）
- 类名和接口名使用 PascalCase（大驼峰）
- 常量使用 UPPER_SNAKE_CASE（大写下划线）
- 私有成员使用下划线前缀（`_privateMethod`）

### 导入规范

- 使用 `import type` 导入类型
- 导入顺序：外部依赖 → 内部包 → 相对路径
- 使用路径别名（如 `@sqlgui/*`）引用内部包
- 禁止使用 Node.js 内置模块的直接导入，应使用 `node:` 前缀（如 `node:fs`）

### 类型定义

- 组件 props 应使用 interface 定义，便于扩展
- 接口命名应为 `ComponentNameProps` 或 `FunctionNameParams`
- 复杂的数据结构应拆分为多个接口定义
- 适当使用泛型增强类型灵活性
- 使用交叉类型（&）合并多个类型
- 使用字面量联合类型定义有限的选项集合
- 避免使用 `enum`，优先使用联合类型和 `as const`
- 尽可能依赖 TypeScript 的类型推断
- 只在必要时使用类型断言（`as`）

### 代码组织

- 应用放在 `apps/` 目录下
- 共享包放在 `packages/` 目录下
- 包的源代码放在 `packages/{package-name}/src/` 目录
- 使用 `index.ts` 作为包的入口文件

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

- Button / IconButton
- Input / Textarea
- Label / Select / Checkbox / Radio / Switch
- Dialog / Drawer / Popover / Tooltip / DropdownMenu
- Tabs
- Badge / Separator
- ScrollArea / EmptyState
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

禁止写法：

```tsx
<button className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent" />
<input className="w-full rounded-md border bg-background px-2 py-1.5 text-sm" />
<select className="w-full rounded-md border bg-background px-2 py-1.5 text-sm" />
```

### 原始 H5 标签使用限制

#### 禁止直接使用

在 `apps/desktop/src/**/*.{ts,tsx}` 中，默认禁止直接使用以下原始标签：

- `button` → 使用 `Button` / `IconButton`
- `input` → 使用 `Input`
- `textarea` → 使用 `Textarea`
- `select` → 使用 `Select`
- `option` → 使用 `Select` 的 children
- `dialog` → 使用 `Dialog`

#### 可以直接使用

以下语义或布局标签可以继续直接使用：

- `div` / `section` / `main` / `header` / `footer` / `aside`
- `span` / `p` / `pre` / `code`
- `ul` / `li`

但如果某段布局反复出现，应抽象为 `@sqlgui/ui` 或业务组件。

### 样式约束

业务代码中禁止重复手写以下样式组合：

```tsx
className = 'rounded-md border px-3 py-1.5 text-sm hover:bg-accent';
className = 'w-full rounded-md border bg-background px-2 py-1.5 text-sm';
className = 'flex items-center gap-1 rounded px-1.5 py-0.5 text-xs';
```

这类样式必须沉淀为：`Button`、`IconButton`、`Input`、`ToolbarButton`、`TreeItem`、`PanelHeader`、`EmptyState` 等组件。

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

修改以下文件时应优先清理原始 H5 控件：

- `apps/desktop/src/workbench/connections/ConnectionDialog.tsx`
- `apps/desktop/src/workbench/editor/components/EditorToolbar.tsx`
- `apps/desktop/src/workbench/layout/BottomPanel.tsx`
- `apps/desktop/src/workbench/results/components/ResultGrid.tsx`
- `apps/desktop/src/workbench/connections/ConnectionsTree.tsx`
- `apps/desktop/src/workbench/command/CommandPalette.tsx`
- `apps/desktop/src/workbench/views/SettingsView.tsx`

### AI 助手约束

AI 助手在修改 UI 相关代码时必须遵守：

- 不允许在 `apps/desktop` 中新增原始 `button/input/select/textarea/dialog`
- 不允许复制粘贴重复 Tailwind 样式
- 优先复用 `@sqlgui/ui`
- 如果 `@sqlgui/ui` 缺组件，应先补充 UI 包组件，再修改业务组件
- 修改 UI 时应同步更新相关导出文件
- 新增公共 UI 组件必须补充 props 类型和必要注释

## Monorepo 工作流

### 包管理

- 所有包共享根目录的依赖（devDependencies）
- 包特定的依赖应在对应包的 `package.json` 中声明
- 使用 pnpm workspace 协议引用内部包
- 包之间的依赖应通过 workspace 协议声明

### 内部包命名

- 使用 `@sqlgui/*` 命名空间（如 `@sqlgui/ui`, `@sqlgui/utils`）
- 使用 `workspace:*` 协议引用内部包

### 构建和发布

- **packages** 使用 rolldown 构建，构建产物放在 `packages/{package-name}/dist/` 目录
- **apps/desktop** 使用 Vite + Tauri
- 使用路径别名简化导入

### 路径别名

项目配置了路径别名以便于包之间的引用：

- `@sqlgui/*` 映射到 `packages/*/src`
- `@sqlgui/tsconfig` 映射到 `packages/tsconfig`

## Git 和 Pull Request 规范

### 分支管理

禁止直接提交到以下保护分支：

- `main`：主分支，用于发布
- `master`：主分支（如果存在）

### 开发流程

1. 从主分支（`main` 或 `master`）创建新的功能分支
2. 在新分支上进行开发
3. 提交 Pull Request 到目标分支
4. 等待 Code Review 和 CI 通过
5. 合并到目标分支

### 分支命名规范

- 功能开发：`feat/description-of-feature`
- 问题修复：`fix/issue-number-or-description`
- 文档更新：`docs/what-is-changed`
- 代码重构：`refactor/what-is-changed`
- 样式修改：`style/what-is-changed`
- 测试相关：`test/what-is-changed`
- 构建相关：`build/what-is-changed`
- 持续集成：`ci/what-is-changed`
- 性能优化：`perf/what-is-changed`
- 依赖升级：`deps/package-name-version`
- 开发体验：`dx/what-is-changed`
- 工作流：`workflow/what-is-changed`
- 类型相关：`types/what-is-changed`
- 发布：`release/version`

### 分支命名注意事项

1. 使用小写字母
2. 使用连字符（-）分隔单词
3. 简短但具有描述性
4. 避免使用下划线或其他特殊字符
5. 如果与 Issue 关联，可以包含 Issue 编号

### Commit Message 规范

项目使用 Conventional Commits 规范，commit message 格式为：

```
<type>(<scope>): <subject>
```

#### Type 类型

- `feat`：新功能
- `fix`：Bug 修复
- `docs`：文档更新
- `dx`：开发体验改进
- `style`：代码格式（不影响代码运行的变动）
- `refactor`：重构（既不是新增功能，也不是修复 Bug）
- `perf`：性能优化
- `test`：测试相关
- `workflow`：工作流相关
- `build`：构建系统或外部依赖的变动
- `ci`：CI 配置文件和脚本的变动
- `chore`：其他变动（如构建过程或辅助工具的变动）
- `types`：类型定义相关
- `wip`：进行中的工作
- `release`：发布新版本

#### Scope（可选）

指定影响的范围，如包名或模块名。

#### Subject

简短的描述，不超过 50 个字符，首字母小写，结尾不加句号。

#### 示例

```
feat(compiler): add 'comments' option
fix(v-model): handle events on blur (close #28)
docs: update README with installation guide
refactor(parser): simplify AST node creation
```

### Pull Request 规范

#### PR 标题

- PR 标题始终使用英文
- 遵循格式：`<type>: <简短描述>`
- 例如：`fix: fix type error in parser module`
- 例如：`feat: add support for new syntax feature`

#### PR 内容

- PR 内容默认使用英文
- 尽量简洁清晰地描述改动内容和目的
- 可以视需要在英文描述后附上中文说明
- 如果修复了 Issue，请在描述中引用（如 `close #123`）

#### PR 提交注意事项

1. **审核流程**：
   - PR 需要由至少一名维护者审核通过后才能合并
   - 确保所有 CI 检查都通过
   - 解决所有 Code Review 中提出的问题

2. **PR 质量要求**：
   - 确保代码符合项目代码风格
   - 添加必要的测试用例（如已配置测试框架）
   - 更新相关文档
   - 大型改动需要更详细的说明和更多的审核者参与
   - 确保 TypeScript 类型检查通过
   - 确保 ESLint 检查通过

3. **工具标注**：
   - 如果是用 Cursor 提交的代码，请在 PR body 末尾进行标注：`> Submitted by Cursor`

### PR 改动类型

- 🆕 新特性提交
- 🐞 Bug 修复
- 📝 文档改进
- 💄 样式/格式改进
- 🤖 TypeScript 更新
- 📦 包体积优化
- ⚡️ 性能优化
- 🛠 重构或工具链优化
- ✅ 新增或更新测试用例
- 🔧 配置或工作流改进

## 质量保证

### 代码质量要求

- 确保代码运行正常，无运行时错误
- 通过所有 ESLint 检查（`pnpm lint`）
- 通过代码格式检查（Prettier）
- 避免使用已废弃的 API

### 性能要求

- 避免不必要的计算和内存分配
- 合理使用缓存机制
- 优化关键路径的性能
- 注意包体积大小

### 兼容性要求

- 确保在目标环境中正常运行

## 工具链和环境

### 开发工具

- 推荐使用 VS Code 或其他支持 TypeScript 的编辑器
- 配置 ESLint 和 Prettier 插件
- 使用 TypeScript 严格模式
- 配置 Git hooks 进行代码检查（已通过 simple-git-hooks 配置）

### 构建工具

- **packages**: 使用 rolldown 进行打包，支持 ESM 和 CJS 输出
- **apps/desktop**: 使用 Vite + Tauri
- **Rust crates**: 使用 cargo
- 使用路径别名简化导入

### CI/CD

- 所有 PR 应通过 CI 检查
- 包括代码风格检查
- 支持多环境部署

### Git Hooks

项目配置了以下 Git hooks：

- **pre-commit**：运行 lint-staged 进行代码格式化
- **commit-msg**：验证 commit message 格式

### Lint-staged 配置

提交前会自动运行：

- JavaScript/JSON 文件：Prettier 格式化
- TypeScript 文件：ESLint 修复 + Prettier 格式化

## 代码检查规则

### ESLint 规则要点

- 禁止使用 `debugger`
- 禁止使用 `console.log`，允许 `console.warn`、`console.error`、`console.info`
- 禁止使用对象展开运算符（使用 `extend` helper）
- 禁止使用 const enum
- 强制使用 `import type` 导入类型
- 强制使用 `node:` 前缀导入 Node.js 内置模块
- 禁止使用 DOM 全局变量（如 `window`、`document`）和 Node.js 全局变量（如 `module`、`require`）

### 业务代码 H5 元素约束

`apps/desktop/src/**/*.{ts,tsx}` 中禁止直接使用 `button`、`input`、`textarea`、`select`、`option`、`dialog` 等基础 H5 控件，应使用 `@sqlgui/ui` 中对应的组件。该规则已在 `eslint.config.js` 中配置为 `error` 级别。

### TypeScript 配置要点

- 启用严格模式
- 启用 `isolatedModules`
- 启用 `esModuleInterop`

## 特别说明

如果使用 AI 编程助手（如 Cursor）进行开发，请在提交 PR 时在末尾标注：`> Submitted by Cursor`
