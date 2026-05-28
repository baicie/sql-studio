可以，远期目标可以明确加这三条，但顺序要控制好：

**MVP 阶段不要碰太多。**
当前项目还处于模板骨架阶段，Web/Desktop 页面还是计数器，Rust/Tauri 侧也还没有 DB Core，所以远期能力应该先写进路线图，但实现要排在基础 SQL GUI 闭环之后。

我建议把最终定位改成：

> **SQL Studio：本地优先、可插件化、支持 SQL Agent、数据同步与分布式协作的现代数据库工作台。**

---

# 新版长期路线图

## Phase 0 - Phase 2：当前优先级不变

先完成：

1. Desktop 基础布局
2. SQLite 查询闭环
3. PostgreSQL / MySQL 支持
4. 连接管理
5. Schema Tree
6. SQL Editor
7. Result Grid
8. 查询历史
9. 本地配置持久化

这部分完成后，才算真正 MVP。

---

# Phase 3：SQL Agent

SQL Agent 是非常适合加的，但它不能只做“聊天”。它应该围绕数据库工作流做能力。

## SQL Agent 第一阶段能力

### 1. SQL 解释

用户选中一段 SQL，Agent 可以解释：

```sql
SELECT u.name, COUNT(o.id)
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id;
```

输出：

```txt
这段 SQL 查询每个用户的订单数量。
users 是主表，orders 通过 user_id 关联。
LEFT JOIN 保证没有订单的用户也会显示。
GROUP BY u.id 用于按用户聚合。
```

---

### 2. SQL 错误解释

数据库报错：

```txt
column "user_id" does not exist
```

Agent 给出：

```txt
错误原因：当前表中不存在 user_id 字段。
可能原因：
1. 字段名实际叫 userId、uid、userID
2. 当前查询的表不是你以为的那张表
3. JOIN 条件写错了

建议先执行：
SELECT column_name FROM information_schema.columns WHERE table_name = 'orders';
```

---

### 3. SQL 优化建议

Agent 可以分析：

1. 是否缺索引
2. 是否全表扫描
3. JOIN 条件是否合理
4. WHERE 条件是否能利用索引
5. LIMIT 是否缺失
6. SELECT \* 是否需要优化

---

### 4. 自然语言生成 SQL

例如：

```txt
查一下最近 7 天每天的订单数
```

生成：

```sql
SELECT DATE(created_at) AS day, COUNT(*) AS order_count
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY day;
```

---

### 5. Schema 感知

这是 SQL Agent 的关键。

不要让 Agent 盲写 SQL。它应该能拿到：

```ts
interface AgentDatabaseContext {
  dialect: 'sqlite' | 'postgres' | 'mysql';
  currentConnectionId: string;
  currentDatabase?: string;
  currentSchema?: string;
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      primaryKey?: boolean;
    }>;
  }>;
}
```

这样 Agent 才能基于真实表结构生成 SQL。

---

## SQL Agent 技术设计

建议分三层：

```txt
agent/
  context/       收集数据库上下文
  tools/         Agent 可调用工具
  providers/     OpenAI / DeepSeek / Ollama / 自定义 API
  prompts/       SQL 解释、优化、生成、排错模板
```

Agent tools 可以设计成：

```ts
interface SqlAgentTool {
  name: string;
  description: string;
  execute(input: unknown): Promise<unknown>;
}
```

核心工具：

```txt
get_current_schema
get_table_columns
run_readonly_query
explain_query
get_query_history
get_connection_dialect
```

注意：Agent 初期必须默认只允许 **只读查询**，避免直接执行 `DROP`、`DELETE`、`UPDATE`。

---

# Phase 4：数据同步

数据同步非常有价值，但比 SQL Agent 更偏工程底层，建议放在 Agent 之后。

## 数据同步可以分三种

### 1. 表级同步

从 A 数据库同步到 B 数据库。

例如：

```txt
PostgreSQL.users -> MySQL.users
SQLite.local_logs -> PostgreSQL.logs
```

能力：

1. 全量同步
2. 增量同步
3. 字段映射
4. 类型转换
5. 冲突处理
6. 失败重试
7. 同步日志

---

### 2. 查询结果同步

用户写一段 SQL，把结果同步到目标表。

例如：

```sql
SELECT id, name, email FROM users WHERE status = 'active';
```

同步到：

```txt
analytics.active_users
```

这个对个人工具很好用，实现也比 CDC 简单。

---

### 3. 文件同步

支持导入导出：

1. CSV -> DB
2. JSON -> DB
3. DB -> CSV
4. DB -> JSON
5. Excel 后续支持

---

## 数据同步 MVP 建议

第一版别做 CDC，先做：

```txt
查询结果 -> 目标表
```

原因：

1. 实现简单
2. 用户容易理解
3. 和 SQL 编辑器天然结合
4. 不需要深入数据库 binlog / WAL
5. 能快速形成产品差异化

同步任务模型：

```ts
interface SyncTask {
  id: string;
  name: string;
  sourceConnectionId: string;
  targetConnectionId: string;
  sourceQuery: string;
  targetTable: string;
  mode: 'append' | 'replace' | 'upsert';
  mapping: Array<{
    sourceColumn: string;
    targetColumn: string;
  }>;
  schedule?: {
    type: 'manual' | 'interval' | 'cron';
    value?: string;
  };
}
```

---

## 数据同步执行架构

```txt
Frontend
  ↓
Tauri Command
  ↓
Rust Sync Engine
  ↓
Source Connector
  ↓
Transform Pipeline
  ↓
Target Connector
  ↓
Sync Log
```

Rust 侧建议拆：

```txt
sync/
  task.rs
  engine.rs
  source.rs
  target.rs
  mapper.rs
  scheduler.rs
  log.rs
```

同步执行结果：

```ts
interface SyncResult {
  taskId: string;
  status: 'success' | 'failed' | 'partial';
  readRows: number;
  writtenRows: number;
  skippedRows: number;
  failedRows: number;
  elapsedMs: number;
  error?: string;
}
```

---

# Phase 5：分布式能力

分布式是最远期目标，不建议一开始做成“大型分布式数据库工具”。你可以把它拆成三个层级。

---

## Level 1：本地优先 + 云同步

这是最现实的第一步。

同步内容包括：

1. 连接配置，敏感信息除外
2. SQL 片段
3. 查询历史
4. 工作区布局
5. 插件配置
6. 同步任务配置

架构：

```txt
Local App
  ↓
Local SQLite
  ↓
Cloud Sync API
  ↓
PostgreSQL / Object Storage
```

这个阶段不是真分布式执行，而是“多设备同步”。

---

## Level 2：远程 Runner

用户本地 UI 发起任务，由远程 Runner 执行。

适合：

1. 长时间同步任务
2. 定时任务
3. 大数据导入导出
4. 团队共享数据任务
5. 内网数据库代理访问

架构：

```txt
SQL Studio Desktop
  ↓
Control Plane API
  ↓
Runner Agent
  ↓
Database
```

Runner 可以是一个单独进程：

```txt
sql-studio-runner
```

部署在服务器或者内网机器上。

---

## Level 3：分布式任务调度

这才是真正的分布式阶段。

能力：

1. 多 Runner 注册
2. 任务分发
3. 心跳检测
4. 失败重试
5. 权限隔离
6. 日志聚合
7. 任务状态追踪
8. 数据同步分片执行

架构：

```txt
Desktop / Web Console
        ↓
Control Plane
        ↓
Task Scheduler
        ↓
Runner 1 / Runner 2 / Runner 3
        ↓
Postgres / MySQL / SQLite / API / File
```

核心服务：

```txt
control-plane     管理连接、任务、用户、权限
runner            执行查询、同步、导入导出任务
scheduler         分发任务
metadata-store    保存任务状态和配置
event-log         记录任务事件
```

---

# 最终产品路线图版本

## V0.1：SQL GUI MVP

目标：能作为本地 SQL 客户端使用。

包含：

1. SQLite 支持
2. PostgreSQL 支持
3. MySQL 支持
4. 连接管理
5. SQL Editor
6. 查询执行
7. Result Grid
8. Schema Tree
9. 查询历史

---

## V0.2：体验增强版

目标：用起来像成熟 SQL GUI。

包含：

1. 多 Tab
2. SQL 格式化
3. SQL Snippet
4. 导出 CSV / JSON
5. 连接分组
6. 表结构查看
7. DDL 查看
8. 主题配置
9. 快捷键系统

---

## V0.3：插件系统

目标：为 Agent、同步、扩展能力打基础。

包含：

1. JS 插件
2. Rust 插件，后续
3. WASM 插件，后续
4. 命令系统
5. 插件贡献点
6. 菜单扩展
7. 面板扩展
8. 插件市场雏形

---

## V0.4：SQL Agent

目标：让 SQL Studio 具备智能开发能力。

包含：

1. SQL 解释
2. SQL 生成
3. SQL 优化
4. 错误解释
5. Schema 感知
6. 只读查询工具
7. OpenAI / DeepSeek / Ollama provider
8. Agent Chat Panel
9. Agent Inline Action

---

## V0.5：数据同步

目标：从 SQL GUI 升级为轻量数据工具。

包含：

1. 查询结果同步到目标表
2. CSV / JSON 导入导出
3. 表到表同步
4. 字段映射
5. 类型转换
6. append / replace / upsert
7. 手动任务
8. 定时任务
9. 同步日志

---

## V0.6：云同步与账号系统

目标：支持多设备和轻量团队协作。

包含：

1. 用户账号
2. Workspace
3. 连接配置同步
4. SQL 片段同步
5. 查询历史同步
6. 插件配置同步
7. 同步任务配置同步
8. 敏感信息本地加密

---

## V0.7：Remote Runner

目标：支持远程执行和内网部署。

包含：

1. Runner 注册
2. Runner 心跳
3. 远程查询执行
4. 远程同步任务
5. 任务日志
6. 失败重试
7. 权限控制
8. Runner Token

---

## V0.8：分布式任务平台

目标：形成真正的分布式数据工作台。

包含：

1. 多 Runner 调度
2. 任务队列
3. 分片同步
4. 任务依赖
5. 重试策略
6. 日志聚合
7. 监控面板
8. 团队权限
9. 审计日志

---

# 我建议你最终产品定位这样写

可以把项目定位成：

> **SQL Studio 是一个本地优先的现代数据库工作台，早期聚焦跨数据库查询与管理，后续通过 SQL Agent、插件系统、数据同步和分布式 Runner，逐步演进为轻量级数据开发与数据运维平台。**

这句话比较适合 README、Roadmap、项目介绍。

---

# 最佳实现顺序

我建议顺序固定为：

```txt
SQL GUI 基础能力
  ↓
插件系统
  ↓
SQL Agent
  ↓
数据同步
  ↓
云同步
  ↓
Remote Runner
  ↓
分布式任务平台
```

不要先做分布式。
也不要先做 Agent。
更不要先做数据同步。

当前最关键的是先把：

```txt
连接数据库 -> 展示库表 -> 写 SQL -> 执行 SQL -> 展示结果
```

这个链路打通。完成这个之后，SQL Agent、同步、分布式才有落点。
