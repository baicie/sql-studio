下面是 **Phase 12：本地插件安装 / 打包 / 卸载 / 开发者加载详细设计与代码草案**。

这一阶段目标是：

> **把插件从“项目内 demo 目录”升级成真正可安装、可卸载、可更新、可本地开发调试的扩展包。**

Phase 8-11 已经完成：

```txt
Phase 8  Manifest + Contribution Registry
Phase 9  @sqlgui/api + @sqlgui/sdk
Phase 10 Web Worker Plugin Host
Phase 11 Permission Broker
```

Phase 12 要补齐插件生命周期里的这一段：

```txt
本地插件目录 / .sgx 插件包
  ↓
安装
  ↓
校验 manifest
  ↓
复制到 appData/extensions
  ↓
写入 installed-extensions.json
  ↓
权限确认
  ↓
注册 contributions
  ↓
激活 / 禁用 / 卸载 / 更新
```

---

# 1. Phase 12 总目标

## 必做功能

```txt
[ ] 定义 .sgx 插件包格式
[ ] 支持从本地文件夹加载插件
[ ] 支持从 .sgx 文件安装插件
[ ] 支持复制模式 copy install
[ ] 支持开发模式 linked install
[ ] 支持卸载插件
[ ] 支持更新插件
[ ] 支持 installed-extensions.json
[ ] 支持插件安装目录规范
[ ] 支持 manifest 校验
[ ] 支持入口文件存在性校验
[ ] 支持路径穿越防护
[ ] 支持插件安装失败回滚
[ ] 支持安装后重新扫描/注册贡献点
[ ] 支持权限变更触发重新授权
[ ] 支持插件包打包命令草案
[ ] 支持 Installed Extensions UI 完整管理
```

## 暂不做

```txt
[ ] 不做线上插件市场
[ ] 不做插件签名
[ ] 不做插件评分评论
[ ] 不做发布账号系统
[ ] 不做自动更新服务
[ ] 不做企业私有源
[ ] 不做 Native 插件安装
[ ] 不做 WASM 插件独立安装策略
```

Phase 12 的定位是：

> **本地插件包管理系统。**

---

# 2. 插件安装形态

Phase 12 支持三种来源。

## 2.1 内置开发插件

项目仓库里的插件：

```txt
extensions/sql-formatter-demo
extensions/explain-viewer-demo
```

用途：

```txt
开发调试
官方内置插件
MVP demo
```

---

## 2.2 本地文件夹插件

用户或开发者选择一个插件目录：

```txt
/Users/bai/workspace/my-sqlgui-extension
```

支持两种模式：

```txt
copy  复制到 appData/extensions
link  记录原目录路径，开发时直接加载原目录
```

推荐：

```txt
普通用户：copy
插件开发：link
```

---

## 2.3 .sgx 插件包

插件打包后的文件：

```txt
baicie.sql-formatter-demo-0.1.0.sgx
```

本质是 zip：

```txt
baicie.sql-formatter-demo-0.1.0.sgx
├─ sqlgui.extension.json
├─ dist/
│  └─ extension.js
├─ README.md
├─ CHANGELOG.md
├─ LICENSE
├─ icon.png
└─ package.json
```

Phase 12 暂不做签名，但保留字段：

```txt
signature.sig  后续 Phase 14 加
checksums.json 后续 Phase 14 加
```

---

# 3. 本地目录设计

应用数据目录：

```txt
~/.sqlgui/
├─ extensions/
│  ├─ baicie.sql-formatter-demo/
│  │  └─ 0.1.0/
│  │     ├─ sqlgui.extension.json
│  │     ├─ dist/extension.js
│  │     ├─ README.md
│  │     └─ package.json
│  │
│  └─ baicie.explain-viewer/
│     └─ 0.1.0/
│        └─ ...
│
├─ extension-dev-links.json
├─ installed-extensions.json
├─ extension-state.json
├─ extension-permissions.json
└─ extension-cache/
```

## 3.1 installed-extensions.json

```json
{
  "baicie.sql-formatter-demo": {
    "id": "baicie.sql-formatter-demo",
    "publisher": "baicie",
    "name": "sql-formatter-demo",
    "displayName": "SQL Formatter Demo",
    "version": "0.1.0",
    "installType": "package",
    "enabled": true,
    "extensionPath": "/Users/bai/.sqlgui/extensions/baicie.sql-formatter-demo/0.1.0",
    "manifestPath": "/Users/bai/.sqlgui/extensions/baicie.sql-formatter-demo/0.1.0/sqlgui.extension.json",
    "installedAt": 1770000000000,
    "updatedAt": 1770000000000,
    "manifestHash": "xxxx"
  }
}
```

## 3.2 extension-dev-links.json

```json
{
  "baicie.sql-formatter-demo": {
    "id": "baicie.sql-formatter-demo",
    "extensionPath": "/Users/bai/workspace/sqlgui/extensions/sql-formatter-demo",
    "enabled": true,
    "linkedAt": 1770000000000
  }
}
```

---

# 4. 插件安装生命周期

## 4.1 从 .sgx 安装

```txt
用户选择 .sgx
  ↓
Rust 解压到临时目录
  ↓
检查 sqlgui.extension.json
  ↓
校验 manifest 字段
  ↓
检查 main 文件存在
  ↓
生成 extensionId = publisher.name
  ↓
检查版本冲突
  ↓
复制到 appData/extensions/{extensionId}/{version}
  ↓
写 installed-extensions.json
  ↓
前端重新扫描插件
  ↓
Permission Broker 检查权限
  ↓
Contribution Registry 注册贡献点
```

## 4.2 从文件夹安装 copy

```txt
选择插件目录
  ↓
读取 manifest
  ↓
校验入口文件
  ↓
复制整个目录到 appData/extensions/{extensionId}/{version}
  ↓
写 installed registry
  ↓
重新加载插件
```

## 4.3 从文件夹安装 link

```txt
选择插件目录
  ↓
读取 manifest
  ↓
校验入口文件
  ↓
不复制文件
  ↓
写 extension-dev-links.json
  ↓
扫描器额外扫描 linked 目录
  ↓
重新加载插件
```

---

# 5. Rust 类型设计

```rust
// crates/sqlgui-extension/src/types.rs

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ExtensionInstallType {
    Package,
    FolderCopy,
    FolderLink,
    Builtin,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledExtensionRecord {
    pub id: String,
    pub publisher: String,
    pub name: String,
    pub display_name: String,
    pub version: String,
    pub install_type: ExtensionInstallType,
    pub enabled: bool,
    pub extension_path: String,
    pub manifest_path: String,
    pub installed_at: i64,
    pub updated_at: i64,
    pub manifest_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallFromPackageRequest {
    pub package_path: String,
    pub overwrite: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallFromFolderRequest {
    pub folder_path: String,
    pub mode: FolderInstallMode,
    pub overwrite: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum FolderInstallMode {
    Copy,
    Link,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UninstallExtensionRequest {
    pub extension_id: String,
    pub remove_data: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionInstallResult {
    pub extension: InstalledExtensionRecord,
}
```

---

# 6. Rust Manifest 解析

```rust
// crates/sqlgui-extension/src/manifest.rs

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

const MANIFEST_FILE: &str = "sqlgui.extension.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionManifest {
    pub name: String,
    pub publisher: String,
    pub version: String,
    pub display_name: Option<String>,
    pub description: Option<String>,
    pub main: Option<String>,
    pub icon: Option<String>,
}

impl ExtensionManifest {
    pub fn id(&self) -> String {
        format!("{}.{}", self.publisher, self.name)
    }

    pub fn display_name(&self) -> String {
        self.display_name
            .clone()
            .unwrap_or_else(|| self.name.clone())
    }
}

pub fn read_manifest(extension_path: &Path) -> Result<(ExtensionManifest, PathBuf)> {
    let manifest_path = extension_path.join(MANIFEST_FILE);

    if !manifest_path.exists() {
        return Err(anyhow!("Missing {}", MANIFEST_FILE));
    }

    let content = fs::read_to_string(&manifest_path)?;
    let manifest: ExtensionManifest = serde_json::from_str(&content)?;

    validate_manifest(&manifest)?;
    validate_main_file(extension_path, &manifest)?;

    Ok((manifest, manifest_path))
}

pub fn validate_manifest(manifest: &ExtensionManifest) -> Result<()> {
    if manifest.name.trim().is_empty() {
        return Err(anyhow!("Manifest field name is required"));
    }

    if manifest.publisher.trim().is_empty() {
        return Err(anyhow!("Manifest field publisher is required"));
    }

    if manifest.version.trim().is_empty() {
        return Err(anyhow!("Manifest field version is required"));
    }

    if !is_valid_id_part(&manifest.name) {
        return Err(anyhow!("Invalid extension name"));
    }

    if !is_valid_id_part(&manifest.publisher) {
        return Err(anyhow!("Invalid extension publisher"));
    }

    Ok(())
}

pub fn validate_main_file(
    extension_path: &Path,
    manifest: &ExtensionManifest,
) -> Result<()> {
    let Some(main) = &manifest.main else {
        return Ok(());
    };

    if main.contains("..") {
        return Err(anyhow!("Invalid main path"));
    }

    let main_path = extension_path.join(main);

    if !main_path.exists() {
        return Err(anyhow!("Extension main file not found: {}", main));
    }

    if !main_path.starts_with(extension_path) {
        return Err(anyhow!("Main path escapes extension directory"));
    }

    Ok(())
}

fn is_valid_id_part(value: &str) -> bool {
    let bytes = value.as_bytes();

    if bytes.is_empty() {
        return false;
    }

    value.chars().all(|ch| {
        ch.is_ascii_lowercase() || ch.is_ascii_digit() || ch == '-'
    })
}
```

---

# 7. Rust Registry 存储

```rust
// crates/sqlgui-extension/src/registry.rs

use crate::types::InstalledExtensionRecord;
use anyhow::Result;
use serde_json::json;
use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;

#[derive(Clone)]
pub struct ExtensionRegistryStore {
    registry_path: PathBuf,
}

impl ExtensionRegistryStore {
    pub fn new(registry_path: PathBuf) -> Self {
        Self { registry_path }
    }

    pub fn load(&self) -> Result<BTreeMap<String, InstalledExtensionRecord>> {
        if !self.registry_path.exists() {
            return Ok(BTreeMap::new());
        }

        let content = fs::read_to_string(&self.registry_path)?;
        let records = serde_json::from_str(&content)?;

        Ok(records)
    }

    pub fn save(
        &self,
        records: &BTreeMap<String, InstalledExtensionRecord>,
    ) -> Result<()> {
        if let Some(parent) = self.registry_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let content = serde_json::to_string_pretty(records)?;
        fs::write(&self.registry_path, content)?;

        Ok(())
    }

    pub fn upsert(&self, record: InstalledExtensionRecord) -> Result<()> {
        let mut records = self.load()?;
        records.insert(record.id.clone(), record);
        self.save(&records)
    }

    pub fn remove(&self, extension_id: &str) -> Result<Option<InstalledExtensionRecord>> {
        let mut records = self.load()?;
        let removed = records.remove(extension_id);
        self.save(&records)?;
        Ok(removed)
    }
}
```

---

# 8. Rust 安装工具

## 8.1 文件复制与删除

```rust
// crates/sqlgui-extension/src/fs_utils.rs

use anyhow::{anyhow, Result};
use std::fs;
use std::path::Path;

pub fn copy_dir_recursive(from: &Path, to: &Path) -> Result<()> {
    if !from.exists() {
        return Err(anyhow!("Source directory does not exist"));
    }

    fs::create_dir_all(to)?;

    for entry in fs::read_dir(from)? {
        let entry = entry?;
        let source = entry.path();
        let target = to.join(entry.file_name());

        if source.is_dir() {
            copy_dir_recursive(&source, &target)?;
        } else {
            fs::copy(&source, &target)?;
        }
    }

    Ok(())
}

pub fn remove_dir_if_exists(path: &Path) -> Result<()> {
    if path.exists() {
        fs::remove_dir_all(path)?;
    }

    Ok(())
}

pub fn ensure_safe_child_path(parent: &Path, child: &Path) -> Result<()> {
    let parent = parent.canonicalize()?;
    let child = child.canonicalize()?;

    if !child.starts_with(parent) {
        return Err(anyhow!("Path escapes parent directory"));
    }

    Ok(())
}
```

---

# 9. Rust 安装管理器

```rust
// crates/sqlgui-extension/src/installer.rs

use crate::fs_utils::{copy_dir_recursive, remove_dir_if_exists};
use crate::manifest::read_manifest;
use crate::registry::ExtensionRegistryStore;
use crate::types::*;
use anyhow::{anyhow, Result};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use tempfile::tempdir;
use zip::ZipArchive;

#[derive(Clone)]
pub struct ExtensionInstaller {
    app_data_dir: PathBuf,
    registry: ExtensionRegistryStore,
}

impl ExtensionInstaller {
    pub fn new(app_data_dir: PathBuf) -> Self {
        let registry_path = app_data_dir.join("installed-extensions.json");

        Self {
            registry: ExtensionRegistryStore::new(registry_path),
            app_data_dir,
        }
    }

    pub fn list_installed(&self) -> Result<Vec<InstalledExtensionRecord>> {
        Ok(self.registry.load()?.into_values().collect())
    }

    pub fn install_from_folder(
        &self,
        request: InstallFromFolderRequest,
    ) -> Result<ExtensionInstallResult> {
        let source_path = PathBuf::from(&request.folder_path);

        if !source_path.exists() {
            return Err(anyhow!("Extension folder does not exist"));
        }

        let (manifest, manifest_path) = read_manifest(&source_path)?;
        let extension_id = manifest.id();

        let extension_path = match request.mode {
            FolderInstallMode::Copy => {
                let target = self.extension_version_dir(
                    &extension_id,
                    &manifest.version,
                );

                if target.exists() {
                    if request.overwrite.unwrap_or(false) {
                        remove_dir_if_exists(&target)?;
                    } else {
                        return Err(anyhow!("Extension already installed"));
                    }
                }

                copy_dir_recursive(&source_path, &target)?;
                target
            }

            FolderInstallMode::Link => source_path.clone(),
        };

        let record = InstalledExtensionRecord {
            id: extension_id,
            publisher: manifest.publisher.clone(),
            name: manifest.name.clone(),
            display_name: manifest.display_name(),
            version: manifest.version.clone(),
            install_type: match request.mode {
                FolderInstallMode::Copy => ExtensionInstallType::FolderCopy,
                FolderInstallMode::Link => ExtensionInstallType::FolderLink,
            },
            enabled: true,
            extension_path: extension_path.to_string_lossy().to_string(),
            manifest_path: extension_path
                .join("sqlgui.extension.json")
                .to_string_lossy()
                .to_string(),
            installed_at: now_ms(),
            updated_at: now_ms(),
            manifest_hash: hash_file(&manifest_path)?,
        };

        self.registry.upsert(record.clone())?;

        Ok(ExtensionInstallResult { extension: record })
    }

    pub fn install_from_package(
        &self,
        request: InstallFromPackageRequest,
    ) -> Result<ExtensionInstallResult> {
        let package_path = PathBuf::from(&request.package_path);

        if !package_path.exists() {
            return Err(anyhow!("Extension package does not exist"));
        }

        let temp = tempdir()?;
        self.extract_package(&package_path, temp.path())?;

        let (manifest, manifest_path) = read_manifest(temp.path())?;
        let extension_id = manifest.id();

        let target = self.extension_version_dir(
            &extension_id,
            &manifest.version,
        );

        if target.exists() {
            if request.overwrite.unwrap_or(false) {
                remove_dir_if_exists(&target)?;
            } else {
                return Err(anyhow!("Extension already installed"));
            }
        }

        copy_dir_recursive(temp.path(), &target)?;

        let record = InstalledExtensionRecord {
            id: extension_id,
            publisher: manifest.publisher.clone(),
            name: manifest.name.clone(),
            display_name: manifest.display_name(),
            version: manifest.version.clone(),
            install_type: ExtensionInstallType::Package,
            enabled: true,
            extension_path: target.to_string_lossy().to_string(),
            manifest_path: target
                .join("sqlgui.extension.json")
                .to_string_lossy()
                .to_string(),
            installed_at: now_ms(),
            updated_at: now_ms(),
            manifest_hash: hash_file(&manifest_path)?,
        };

        self.registry.upsert(record.clone())?;

        Ok(ExtensionInstallResult { extension: record })
    }

    pub fn uninstall(
        &self,
        request: UninstallExtensionRequest,
    ) -> Result<()> {
        let Some(record) = self.registry.remove(&request.extension_id)? else {
            return Ok(());
        };

        match record.install_type {
            ExtensionInstallType::Package | ExtensionInstallType::FolderCopy => {
                let path = PathBuf::from(record.extension_path);
                remove_dir_if_exists(&path)?;
            }

            ExtensionInstallType::FolderLink | ExtensionInstallType::Builtin => {
                // linked / builtin 不删除原始目录
            }
        }

        if request.remove_data.unwrap_or(false) {
            let state_dir = self
                .app_data_dir
                .join("extension-state")
                .join(&request.extension_id);

            remove_dir_if_exists(&state_dir)?;
        }

        Ok(())
    }

    fn extension_version_dir(
        &self,
        extension_id: &str,
        version: &str,
    ) -> PathBuf {
        self.app_data_dir
            .join("extensions")
            .join(extension_id)
            .join(version)
    }

    fn extract_package(
        &self,
        package_path: &Path,
        target_dir: &Path,
    ) -> Result<()> {
        let file = fs::File::open(package_path)?;
        let mut archive = ZipArchive::new(file)?;

        for index in 0..archive.len() {
            let mut file = archive.by_index(index)?;
            let name = file.name();

            if name.contains("..") {
                return Err(anyhow!("Invalid package entry path"));
            }

            let out_path = target_dir.join(name);

            if file.is_dir() {
                fs::create_dir_all(&out_path)?;
            } else {
                if let Some(parent) = out_path.parent() {
                    fs::create_dir_all(parent)?;
                }

                let mut out_file = fs::File::create(&out_path)?;
                std::io::copy(&mut file, &mut out_file)?;
            }
        }

        Ok(())
    }
}

fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

fn hash_file(path: &Path) -> Result<String> {
    let bytes = fs::read(path)?;
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let result = hasher.finalize();

    Ok(format!("{:x}", result))
}
```

需要依赖：

```toml
# crates/sqlgui-extension/Cargo.toml

[dependencies]
anyhow = "1"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
zip = "2"
tempfile = "3"
sha2 = "0.10"
chrono = "0.4"
```

---

# 10. Tauri Commands

```rust
// apps/desktop/src-tauri/src/commands/extension.rs

use tauri::{AppHandle, Manager};

use sqlgui_extension::installer::ExtensionInstaller;
use sqlgui_extension::types::{
    ExtensionInstallResult,
    InstallFromFolderRequest,
    InstallFromPackageRequest,
    InstalledExtensionRecord,
    UninstallExtensionRequest,
};

fn installer(app: &AppHandle) -> Result<ExtensionInstaller, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|err| err.to_string())?;

    Ok(ExtensionInstaller::new(app_data_dir))
}

#[tauri::command]
pub async fn extension_list_installed(
    app: AppHandle,
) -> Result<Vec<InstalledExtensionRecord>, String> {
    installer(&app)?
        .list_installed()
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn extension_install_from_folder(
    app: AppHandle,
    request: InstallFromFolderRequest,
) -> Result<ExtensionInstallResult, String> {
    installer(&app)?
        .install_from_folder(request)
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn extension_install_from_package(
    app: AppHandle,
    request: InstallFromPackageRequest,
) -> Result<ExtensionInstallResult, String> {
    installer(&app)?
        .install_from_package(request)
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn extension_uninstall(
    app: AppHandle,
    request: UninstallExtensionRequest,
) -> Result<(), String> {
    installer(&app)?
        .uninstall(request)
        .map_err(|err| err.to_string())
}
```

注册：

```rust
.invoke_handler(tauri::generate_handler![
    commands::extension::extension_scan,
    commands::extension::extension_read_entry,
    commands::extension::extension_list_installed,
    commands::extension::extension_install_from_folder,
    commands::extension::extension_install_from_package,
    commands::extension::extension_uninstall,
])
```

---

# 11. 前端 ExtensionInstallerService

```ts
// apps/desktop/src/plugins/services/extensionInstallerService.ts

import { callNative } from '@/services/native/invoke';

export type ExtensionInstallType = 'package' | 'folderCopy' | 'folderLink' | 'builtin';

export interface InstalledExtensionRecord {
  id: string;
  publisher: string;
  name: string;
  displayName: string;
  version: string;
  installType: ExtensionInstallType;
  enabled: boolean;
  extensionPath: string;
  manifestPath: string;
  installedAt: number;
  updatedAt: number;
  manifestHash: string;
}

export interface ExtensionInstallResult {
  extension: InstalledExtensionRecord;
}

export const extensionInstallerService = {
  listInstalled() {
    return callNative<InstalledExtensionRecord[]>('extension_list_installed');
  },

  installFromFolder(input: { folderPath: string; mode: 'copy' | 'link'; overwrite?: boolean }) {
    return callNative<ExtensionInstallResult>('extension_install_from_folder', {
      request: {
        folderPath: input.folderPath,
        mode: input.mode,
        overwrite: input.overwrite,
      },
    });
  },

  installFromPackage(input: { packagePath: string; overwrite?: boolean }) {
    return callNative<ExtensionInstallResult>('extension_install_from_package', {
      request: {
        packagePath: input.packagePath,
        overwrite: input.overwrite,
      },
    });
  },

  uninstall(input: { extensionId: string; removeData?: boolean }) {
    return callNative<void>('extension_uninstall', {
      request: {
        extensionId: input.extensionId,
        removeData: input.removeData,
      },
    });
  },
};
```

---

# 12. 文件选择服务

需要选择文件夹和 `.sgx` 文件。Tauri 2 一般通过 dialog plugin 做，这里先封装成接口，具体实现可替换。

```ts
// apps/desktop/src/services/dialogService.ts

import { open } from '@tauri-apps/plugin-dialog';

export const dialogService = {
  async pickExtensionFolder() {
    const result = await open({
      directory: true,
      multiple: false,
      title: 'Select Extension Folder',
    });

    return typeof result === 'string' ? result : undefined;
  },

  async pickExtensionPackage() {
    const result = await open({
      directory: false,
      multiple: false,
      title: 'Select Extension Package',
      filters: [
        {
          name: 'SQL GUI Extension',
          extensions: ['sgx', 'zip'],
        },
      ],
    });

    return typeof result === 'string' ? result : undefined;
  },
};
```

依赖：

```bash
pnpm --filter sqlgui-desktop add @tauri-apps/plugin-dialog
```

Rust 里注册 plugin：

```rust
tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
```

---

# 13. 改造 extension_scan

Phase 8 的扫描器扫的是：

```txt
appData/extensions/*
SQLGUI_DEV_EXTENSIONS_DIR
```

现在安装目录变成：

```txt
appData/extensions/{extensionId}/{version}
```

需要扫描两级。

```rust
// crates/sqlgui-extension/src/scanner.rs

use crate::types::*;
use anyhow::Result;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};

const MANIFEST_FILE: &str = "sqlgui.extension.json";

pub fn scan_extensions(dirs: Vec<PathBuf>) -> Result<ExtensionScanResult> {
    let mut extensions = Vec::new();
    let mut errors = Vec::new();

    for dir in dirs {
        if !dir.exists() {
            continue;
        }

        scan_dir_recursive(&dir, 2, &mut extensions, &mut errors);
    }

    Ok(ExtensionScanResult { extensions, errors })
}

fn scan_dir_recursive(
    dir: &Path,
    depth: usize,
    extensions: &mut Vec<ExtensionManifestFile>,
    errors: &mut Vec<ExtensionScanError>,
) {
    let manifest_path = dir.join(MANIFEST_FILE);

    if manifest_path.exists() {
        match read_manifest_file(dir, &manifest_path) {
            Ok(item) => extensions.push(item),
            Err(err) => errors.push(ExtensionScanError {
                path: dir.to_string_lossy().to_string(),
                message: err.to_string(),
            }),
        }

        return;
    }

    if depth == 0 {
        return;
    }

    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();

        if path.is_dir() {
            scan_dir_recursive(&path, depth - 1, extensions, errors);
        }
    }
}

fn read_manifest_file(
    extension_path: &Path,
    manifest_path: &Path,
) -> Result<ExtensionManifestFile> {
    let content = fs::read_to_string(manifest_path)?;
    let manifest = serde_json::from_str::<Value>(&content)?;

    Ok(ExtensionManifestFile {
        extension_path: extension_path.to_string_lossy().to_string(),
        manifest_path: manifest_path.to_string_lossy().to_string(),
        manifest,
    })
}
```

---

# 14. ExtensionService 改造

安装、卸载后要重新加载插件。

```ts
// apps/desktop/src/plugins/services/extensionService.ts

import { extensionScanner } from './extensionScanner';
import { extensionInstallerService } from './extensionInstallerService';
import { validateManifest } from '../manifest/manifestValidator';
import { normalizeLoadedExtension } from '../manifest/manifestNormalize';
import { extensionRegistry } from '../registry/extensionRegistry';
import { contributionRegistry } from '../registry/contributionRegistry';
import { permissionBroker } from '../permissions/PermissionBroker';
import { pluginHostManager } from '../host/PluginHostManager';
import type { ExtensionManifest } from '@sqlgui/api';

export const extensionService = {
  async initialize() {
    await this.reloadExtensions();
  },

  async reloadExtensions() {
    contributionRegistry.clear?.();
    pluginHostManager.terminateAll();
    extensionRegistry.clear?.();

    const result = await extensionScanner.scan();

    for (const item of result.extensions) {
      const validation = validateManifest(item.manifest);

      if (!validation.valid) {
        console.error(`[Extension] Invalid manifest at ${item.manifestPath}`, validation.errors);
        continue;
      }

      const extension = normalizeLoadedExtension({
        extensionPath: item.extensionPath,
        manifestPath: item.manifestPath,
        manifest: item.manifest as ExtensionManifest,
      });

      extensionRegistry.register(extension);

      if (extension.state === 'enabled') {
        contributionRegistry.registerExtension(extension);
      }
    }

    for (const error of result.errors) {
      console.error('[Extension scan error]', error);
    }
  },

  async installFromPackage(packagePath: string) {
    await extensionInstallerService.installFromPackage({
      packagePath,
      overwrite: true,
    });

    await this.reloadExtensions();
  },

  async installFromFolderCopy(folderPath: string) {
    await extensionInstallerService.installFromFolder({
      folderPath,
      mode: 'copy',
      overwrite: true,
    });

    await this.reloadExtensions();
  },

  async installFromFolderLink(folderPath: string) {
    await extensionInstallerService.installFromFolder({
      folderPath,
      mode: 'link',
      overwrite: true,
    });

    await this.reloadExtensions();
  },

  async uninstall(extensionId: string, removeData = false) {
    contributionRegistry.unregisterExtension(extensionId);
    await pluginHostManager.deactivateExtension(extensionId);

    await extensionInstallerService.uninstall({
      extensionId,
      removeData,
    });

    await this.reloadExtensions();
  },

  async enable(extensionId: string) {
    const extension = extensionRegistry.get(extensionId);
    if (!extension) return;

    const granted = await permissionBroker.ensureManifestGranted(extension);

    if (!granted) return;

    extensionRegistry.enable(extensionId);
    contributionRegistry.registerExtension({
      ...extension,
      state: 'enabled',
    });
  },

  async disable(extensionId: string) {
    contributionRegistry.unregisterExtension(extensionId);
    await pluginHostManager.deactivateExtension(extensionId);
    extensionRegistry.disable(extensionId);
  },
};
```

这里需要给 `extensionRegistry` 和 `contributionRegistry` 补 `clear()`。

```ts
// apps/desktop/src/plugins/registry/extensionRegistry.ts

clear() {
  this.extensions.clear()
  this.emit()
}
```

```ts
// apps/desktop/src/plugins/registry/contributionRegistry.ts

clear() {
  for (const extensionId of this.disposables.keys()) {
    this.unregisterExtension(extensionId)
  }
}
```

---

# 15. 安装 UI 设计

## 15.1 Extensions Development View

```txt
Extensions
├─ Marketplace
├─ Installed
└─ Development
   ├─ Install from .sgx
   ├─ Load from Folder Copy
   ├─ Load from Folder Link
   ├─ Reload Extensions
   └─ Open Extension Logs
```

---

## 15.2 ExtensionDevelopmentView

```tsx
// apps/desktop/src/plugins/components/ExtensionDevelopmentView.tsx

import { Button } from '@/components/ui/button';
import { dialogService } from '@/services/dialogService';
import { extensionService } from '../services/extensionService';

export function ExtensionDevelopmentView() {
  async function installPackage() {
    const packagePath = await dialogService.pickExtensionPackage();
    if (!packagePath) return;

    await extensionService.installFromPackage(packagePath);
  }

  async function installFolderCopy() {
    const folderPath = await dialogService.pickExtensionFolder();
    if (!folderPath) return;

    await extensionService.installFromFolderCopy(folderPath);
  }

  async function installFolderLink() {
    const folderPath = await dialogService.pickExtensionFolder();
    if (!folderPath) return;

    await extensionService.installFromFolderLink(folderPath);
  }

  async function reload() {
    await extensionService.reloadExtensions();
  }

  return (
    <div className="space-y-3 p-3">
      <div>
        <h2 className="text-sm font-medium">Development</h2>
        <p className="text-xs text-muted-foreground">
          Install local extension packages or load an extension folder for development.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={installPackage}>
          Install from .sgx
        </Button>

        <Button variant="outline" onClick={installFolderCopy}>
          Install from Folder Copy
        </Button>

        <Button variant="outline" onClick={installFolderLink}>
          Load from Folder Link
        </Button>

        <Button variant="outline" onClick={reload}>
          Reload Extensions
        </Button>
      </div>
    </div>
  );
}
```

---

# 16. Installed Extension Item 增强

```tsx
// apps/desktop/src/plugins/components/ExtensionListItem.tsx

import { Button } from '@/components/ui/button';
import type { LoadedExtension } from '../manifest/types';
import { extensionService } from '../services/extensionService';

interface ExtensionListItemProps {
  extension: LoadedExtension;
}

export function ExtensionListItem(props: ExtensionListItemProps) {
  const { extension } = props;
  const enabled = extension.state === 'enabled';

  return (
    <div className="mb-2 rounded-md border p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-sm">
          {extension.displayName.slice(0, 1).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate font-medium">{extension.displayName}</div>

            <div className="text-xs text-muted-foreground">v{extension.version}</div>
          </div>

          <div className="text-xs text-muted-foreground">{extension.id}</div>

          <div className="mt-1 text-xs text-muted-foreground">{extension.extensionPath}</div>

          {extension.description ? (
            <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {extension.description}
            </div>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={enabled ? 'outline' : 'default'}
            onClick={async () => {
              if (enabled) {
                await extensionService.disable(extension.id);
              } else {
                await extensionService.enable(extension.id);
              }
            }}
          >
            {enabled ? 'Disable' : 'Enable'}
          </Button>

          <Button size="sm" variant="outline" onClick={() => extensionService.reloadExtensions()}>
            Reload
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={() => extensionService.uninstall(extension.id)}
          >
            Uninstall
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

# 17. 插件打包命令设计

Phase 12 可以先做一个 Node 脚本，不急着做完整 CLI。

目标：

```bash
pnpm sqlgui:pack extensions/sql-formatter-demo
```

输出：

```txt
dist-packages/baicie.sql-formatter-demo-0.1.0.sgx
```

---

## 17.1 scripts/pack-extension.ts

```ts
// scripts/pack-extension.ts

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import archiver from 'archiver';

interface ExtensionManifest {
  name: string;
  publisher: string;
  version: string;
  main?: string;
}

async function main() {
  const extensionDir = process.argv[2];

  if (!extensionDir) {
    throw new Error('Usage: tsx scripts/pack-extension.ts <extension-dir>');
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

function zipDirectory(sourceDir: string, outPath: string) {
  return new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    output.on('close', () => resolve());
    archive.on('error', reject);

    archive.pipe(output);

    archive.glob('**/*', {
      cwd: sourceDir,
      ignore: [
        'node_modules/**',
        'src/**',
        '.git/**',
        '*.tsbuildinfo',
        'vite.config.ts',
        'tsconfig.json',
      ],
    });

    archive.finalize();
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

依赖：

```bash
pnpm add -D archiver @types/archiver tsx
```

根 `package.json`：

```json
{
  "scripts": {
    "sqlgui:pack": "tsx scripts/pack-extension.ts"
  }
}
```

使用：

```bash
pnpm --filter sqlgui-extension-sql-formatter-demo build
pnpm sqlgui:pack extensions/sql-formatter-demo
```

---

# 18. 插件包校验规则

打包前校验：

```txt
[ ] 必须存在 sqlgui.extension.json
[ ] 必须包含 name/publisher/version
[ ] main 文件必须存在
[ ] 不打包 node_modules
[ ] 不打包 src
[ ] 不打包 .git
[ ] 不打包 tsconfig/vite config
[ ] README 可选
[ ] LICENSE 可选
[ ] icon 可选
```

安装时校验：

```txt
[ ] 解压路径不能包含 ..
[ ] manifest 必须合法
[ ] main 文件必须存在
[ ] extensionId 不能为空
[ ] 覆盖安装必须显式 overwrite
[ ] 写入 registry 前先复制成功
[ ] 失败后删除临时目录
```

---

# 19. 插件版本策略

Phase 12 推荐：

```txt
同一个 extensionId 只启用一个版本
安装新版本后覆盖 registry 指向
旧版本可删除
```

目录上可以保留多版本：

```txt
extensions/baicie.sql-formatter-demo/
├─ 0.1.0
└─ 0.2.0
```

registry 指向当前版本：

```json
{
  "baicie.sql-formatter-demo": {
    "version": "0.2.0",
    "extensionPath": ".../0.2.0"
  }
}
```

MVP 简化：

```txt
安装新版本时删除旧版本目录
```

更推荐保留目录，方便回滚，但 UI 暂不暴露历史版本。

---

# 20. 权限系统联动

Phase 12 安装后，不直接激活插件。
激活时由 Phase 11 做权限确认：

```txt
安装插件
  ↓
enabled = true
  ↓
注册 command/menu
  ↓
用户首次执行 command
  ↓
PluginHostManager.activateExtension
  ↓
permissionBroker.ensureManifestGranted
  ↓
弹权限确认
```

也可以在安装完成后立即弹权限确认。MVP 推荐：

```txt
安装时展示权限摘要
首次激活时正式授权
```

原因：

```txt
安装不等于使用
避免安装多个插件时弹窗太多
```

---

# 21. 卸载流程

卸载时要做：

```txt
[ ] unregister contributions
[ ] deactivate worker
[ ] remove installed record
[ ] 删除 package/copy 安装目录
[ ] linked 插件不删除原目录
[ ] 可选删除权限记录
[ ] 可选删除 storage 数据
[ ] reload extension list
```

前端：

```ts
async uninstall(extensionId: string, removeData = false) {
  contributionRegistry.unregisterExtension(extensionId)
  await pluginHostManager.deactivateExtension(extensionId)

  await extensionInstallerService.uninstall({
    extensionId,
    removeData,
  })

  permissionStorage.revoke(extensionId)

  await this.reloadExtensions()
}
```

---

# 22. 安装错误标准化

```ts
// apps/desktop/src/plugins/services/extensionInstallError.ts

export function normalizeExtensionInstallError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('Missing sqlgui.extension.json')) {
    return '插件目录中缺少 sqlgui.extension.json';
  }

  if (message.includes('Extension already installed')) {
    return '插件已安装';
  }

  if (message.includes('main file not found')) {
    return '插件入口文件不存在';
  }

  if (message.includes('Invalid package entry path')) {
    return '插件包包含非法路径';
  }

  return message;
}
```

后续接 i18n。

---

# 23. 开发者加载 link 模式注意点

link 模式适合插件开发：

```txt
插件源码目录
  ↓
pnpm build --watch
  ↓
SQL GUI reload extension host
  ↓
加载最新 dist/extension.js
```

开发体验：

```bash
cd extensions/sql-formatter-demo
pnpm build --watch
```

SQL GUI 里点击：

```txt
Extensions -> Development -> Load from Folder Link
```

修改插件后：

```txt
Reload Extension Host
```

---

# 24. Reload 策略

## 24.1 Reload Extensions

```txt
重新扫描 manifest
重新注册 contributions
不一定激活插件
```

## 24.2 Reload Extension Host

```txt
terminate 所有 Worker
下次执行命令再激活
```

## 24.3 Reload Single Extension

```txt
deactivate 当前插件 Worker
重新读取 entry source
重新 activate
```

推荐 UI：

```txt
Reload Extensions
Reload Extension Host
Reload This Extension
```

---

# 25. Phase 12 命令系统集成

新增命令：

```txt
extensions.installFromPackage
extensions.installFromFolderCopy
extensions.installFromFolderLink
extensions.uninstall
extensions.reloadExtensions
extensions.packExtension，占位
```

```ts
// apps/desktop/src/plugins/registerExtensionInstallCommands.ts

import { commandService } from '@/services/commandService';
import { dialogService } from '@/services/dialogService';
import { extensionService } from './services/extensionService';

export function registerExtensionInstallCommands() {
  commandService.register({
    id: 'extensions.installFromPackage',
    title: 'Install Extension from Package',
    category: 'Extensions',
    source: 'core',
    handler: async () => {
      const packagePath = await dialogService.pickExtensionPackage();
      if (!packagePath) return;

      await extensionService.installFromPackage(packagePath);
    },
  });

  commandService.register({
    id: 'extensions.installFromFolderCopy',
    title: 'Install Extension from Folder',
    category: 'Extensions',
    source: 'core',
    handler: async () => {
      const folderPath = await dialogService.pickExtensionFolder();
      if (!folderPath) return;

      await extensionService.installFromFolderCopy(folderPath);
    },
  });

  commandService.register({
    id: 'extensions.installFromFolderLink',
    title: 'Load Extension from Folder',
    category: 'Extensions',
    source: 'core',
    handler: async () => {
      const folderPath = await dialogService.pickExtensionFolder();
      if (!folderPath) return;

      await extensionService.installFromFolderLink(folderPath);
    },
  });

  commandService.register({
    id: 'extensions.reloadExtensions',
    title: 'Reload Extensions',
    category: 'Extensions',
    source: 'core',
    handler: async () => {
      await extensionService.reloadExtensions();
    },
  });
}
```

---

# 26. Rust Cargo.toml 汇总

```toml
# crates/sqlgui-extension/Cargo.toml

[package]
name = "sqlgui-extension"
version = "0.1.0"
edition = "2021"

[dependencies]
anyhow = "1"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
zip = "2"
tempfile = "3"
sha2 = "0.10"
chrono = "0.4"
```

---

# 27. 前端测试用例

```txt
[ ] extensionInstallerService.installFromPackage 调用正确 command
[ ] extensionInstallerService.installFromFolder copy 调用正确 command
[ ] extensionInstallerService.installFromFolder link 调用正确 command
[ ] extensionService.installFromPackage 后 reloadExtensions
[ ] extensionService.uninstall 后 unregister contributions
[ ] dialogService 取消选择时不安装
[ ] ExtensionDevelopmentView 点击按钮触发安装
[ ] ExtensionListItem 卸载按钮可用
```

---

# 28. Rust 测试用例

```txt
[ ] read_manifest 缺少 manifest 报错
[ ] read_manifest main 不存在报错
[ ] validate_manifest 非法 name 报错
[ ] install_from_folder copy 正常复制
[ ] install_from_folder link 不复制目录
[ ] install_from_package 正常解压
[ ] install_from_package 拒绝路径穿越
[ ] uninstall package 删除目录
[ ] uninstall link 不删除源目录
[ ] registry upsert/load/remove 正常
```

示例：

```rust
#[test]
fn validate_invalid_name() {
    let manifest = ExtensionManifest {
        name: "BadName".to_string(),
        publisher: "baicie".to_string(),
        version: "0.1.0".to_string(),
        display_name: None,
        description: None,
        main: None,
        icon: None,
    };

    assert!(validate_manifest(&manifest).is_err());
}
```

---

# 29. 手动验收流程

## 29.1 从文件夹 link 加载

```txt
[ ] 打开 Extensions -> Development
[ ] 点击 Load from Folder Link
[ ] 选择 extensions/sql-formatter-demo
[ ] 插件出现在 Installed
[ ] Command Palette 出现 Format SQL
[ ] 执行 Format SQL 正常
[ ] 修改插件源码并 build
[ ] 点击 Reload Extension Host
[ ] 新代码生效
```

## 29.2 打包安装

```bash
pnpm --filter sqlgui-extension-sql-formatter-demo build
pnpm sqlgui:pack extensions/sql-formatter-demo
```

```txt
[ ] 点击 Install from .sgx
[ ] 选择 dist-packages/baicie.sql-formatter-demo-0.1.0.sgx
[ ] 插件安装到 appData/extensions
[ ] Installed 展示插件
[ ] Command Palette 出现命令
[ ] 执行命令正常
```

## 29.3 卸载

```txt
[ ] 点击 Uninstall
[ ] 插件从 Installed 消失
[ ] Command Palette 命令消失
[ ] Worker 被 terminate
[ ] package 安装目录被删除
```

---

# 30. Phase 12 完成标准

```txt
[ ] .sgx 包格式确定
[ ] Node 打包脚本可用
[ ] Rust 可安装 .sgx
[ ] Rust 可从文件夹 copy 安装
[ ] Rust 可从文件夹 link 加载
[ ] Rust 可卸载插件
[ ] installed-extensions.json 可读写
[ ] appData/extensions 目录结构稳定
[ ] extension_scan 能扫描安装目录
[ ] 前端安装服务完成
[ ] Development UI 可安装本地插件
[ ] Installed UI 可卸载插件
[ ] 安装后 contributions 生效
[ ] 卸载后 contributions 移除
[ ] link 模式支持插件开发调试
[ ] 路径穿越防护完成
[ ] 安装失败不会污染 registry
```

---

# 31. 最小闭环

Phase 12 最小闭环：

```txt
pnpm build sql-formatter-demo
  ↓
pnpm sqlgui:pack extensions/sql-formatter-demo
  ↓
得到 baicie.sql-formatter-demo-0.1.0.sgx
  ↓
SQL GUI 点击 Install from .sgx
  ↓
Rust 解压并安装到 appData/extensions
  ↓
extensionService.reloadExtensions
  ↓
Command Palette 出现 Format SQL
  ↓
执行命令，插件正常运行
  ↓
点击 Uninstall
  ↓
命令消失，插件目录删除
```

---

# 32. Phase 12 核心价值

Phase 12 做完，你的插件系统就从：

```txt
只能跑项目里的 demo 插件
```

升级为：

```txt
可以安装本地插件包
可以开发者 link 调试
可以卸载/更新
可以为后续插件市场复用同一套安装链路
```

后面的 Phase 13 Mock Marketplace 只需要把：

```txt
点击安装 marketplace 插件
```

转成：

```txt
下载 .sgx
调用 extension_install_from_package
```

所以 Phase 12 是插件市场的底座。
