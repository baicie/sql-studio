# Plugin System

## Manifest

Extensions declare capabilities in `sqlgui.extension.json`. The TypeScript shape lives in `@sqlgui/extension-schema`; Rust parsing in `crates/sqlgui-extension`.

## Demo Extension

`extensions/sql-formatter-demo` registers the `sql.format` command as a placeholder for Phase 3 integration.

## API Surface

`@sqlgui/api` defines `SqlGuiApi` with `commands` and `window` namespaces. Extensions receive an `ExtensionContext` with `subscriptions` for disposal.
