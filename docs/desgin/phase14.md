下面是 **Phase 14：插件签名 / 信任模型 / 包完整性校验 / 远程安装安全加固详细设计与代码草案**。

这一阶段目标是：

> **让插件安装不只是“能装”，而是“能验证来源、能验证包完整性、能识别发布者、能阻止被篡改插件”。**

前面阶段已经完成：

```txt
Phase 12：本地 .sgx 安装 / 卸载 / link 开发
Phase 13：Mock Marketplace / 插件搜索 / 安装 UI
```

Phase 14 要补上：

```txt
.sgx 包完整性校验
  ↓
checksums.json
  ↓
manifest hash
  ↓
publisher public key
  ↓
signature.sig
  ↓
trust policy
  ↓
安装前验证
```

---

# 1. Phase 14 总目标

## 必做功能

```txt
[ ] 定义插件包签名结构
[ ] 定义 checksums.json
[ ] 定义 publisher public key 模型
[ ] 定义 trusted-publishers.json
[ ] 支持 Ed25519 签名校验
[ ] 支持 SHA-256 文件完整性校验
[ ] 安装 .sgx 前验证 checksums
[ ] 安装 .sgx 前验证 signature
[ ] Marketplace 展示 verified / untrusted / unsigned 状态
[ ] 安装未签名插件时弹风险确认
[ ] 安装签名无效插件时默认拒绝
[ ] 支持开发模式跳过签名
[ ] 支持本地信任 publisher
[ ] 支持撤销 publisher trust
[ ] 支持远程 package sha256 校验预留
[ ] 支持安装审计日志
```

## 暂不做

```txt
[ ] 不做完整证书链
[ ] 不做 CA 体系
[ ] 不做在线吊销列表
[ ] 不做账号体系
[ ] 不做官方审核后台
[ ] 不做时间戳签名服务
[ ] 不做企业策略中心
```

Phase 14 的定位是：

> **轻量级插件信任系统。**

---

# 2. 最终安全链路

安装插件时：

```txt
选择 / 下载 .sgx
  ↓
解压到临时目录
  ↓
读取 sqlgui.extension.json
  ↓
读取 checksums.json
  ↓
校验所有文件 SHA-256
  ↓
读取 signature.sig
  ↓
用 publisher public key 验证签名
  ↓
检查 publisher 是否 trusted
  ↓
展示权限 + 签名状态
  ↓
用户确认安装
  ↓
复制到 appData/extensions
```

---

# 3. 插件包结构升级

Phase 12 的 `.sgx`：

```txt
baicie.sql-formatter-demo-0.1.0.sgx
├─ sqlgui.extension.json
├─ dist/extension.js
├─ README.md
├─ package.json
```

Phase 14 升级为：

```txt
baicie.sql-formatter-demo-0.1.0.sgx
├─ sqlgui.extension.json
├─ dist/
│  └─ extension.js
├─ README.md
├─ package.json
├─ checksums.json
└─ signature.sig
```

## checksums.json

```json
{
  "algorithm": "sha256",
  "files": {
    "sqlgui.extension.json": "8b7e...",
    "dist/extension.js": "1f2a...",
    "README.md": "9c31...",
    "package.json": "0af1..."
  }
}
```

注意：

```txt
checksums.json 不包含自己
signature.sig 不包含自己
signature 签的是 checksums.json 的内容
```

## signature.sig

```json
{
  "algorithm": "ed25519",
  "publisher": "baicie",
  "keyId": "baicie.default",
  "signature": "base64...",
  "signedAt": 1770000000000
}
```

---

# 4. Trust 模型

Phase 14 使用轻量模型：

```txt
publisher
  ↓
public key
  ↓
trusted-publishers.json
```

本地信任文件：

```json
{
  "baicie": {
    "publisher": "baicie",
    "displayName": "Bai Cie",
    "trusted": true,
    "keys": [
      {
        "keyId": "baicie.default",
        "algorithm": "ed25519",
        "publicKey": "base64-public-key",
        "createdAt": 1770000000000
      }
    ],
    "trustedAt": 1770000000000
  }
}
```

---

# 5. 目录设计

```txt
apps/desktop/src/plugins/security/
├─ types.ts
├─ trustService.ts
├─ signatureStatus.ts
├─ PluginTrustStore.ts
├─ PluginInstallPolicy.ts
├─ PluginSecurityAuditService.ts
├─ components/
│  ├─ SignatureBadge.tsx
│  ├─ TrustPublisherDialog.tsx
│  ├─ UnsignedInstallWarningDialog.tsx
│  ├─ SignatureInvalidDialog.tsx
│  └─ PluginSecurityPanel.tsx
```

Rust：

```txt
crates/sqlgui-extension/src/
├─ security/
│  ├─ mod.rs
│  ├─ checksum.rs
│  ├─ signature.rs
│  ├─ trust.rs
│  ├─ package_verify.rs
│  └─ types.rs
```

脚本：

```txt
scripts/
├─ pack-extension.ts
├─ sign-extension.ts
└─ generate-extension-key.ts
```

---

# 6. TypeScript 安全类型

```ts
// apps/desktop/src/plugins/security/types.ts

export type SignatureStatus = 'verified' | 'unsigned' | 'invalid' | 'untrusted' | 'unknown';

export interface PublisherKey {
  keyId: string;
  algorithm: 'ed25519';
  publicKey: string;
  createdAt: number;
}

export interface TrustedPublisher {
  publisher: string;
  displayName?: string;
  trusted: boolean;
  keys: PublisherKey[];
  trustedAt: number;
}

export interface PluginSignatureInfo {
  algorithm: 'ed25519';
  publisher: string;
  keyId: string;
  signature: string;
  signedAt: number;
}

export interface PluginChecksumFile {
  algorithm: 'sha256';
  files: Record<string, string>;
}

export interface PluginVerificationResult {
  status: SignatureStatus;
  publisher?: string;
  keyId?: string;
  message?: string;
  checksumsValid: boolean;
  signatureValid: boolean;
  publisherTrusted: boolean;
}
```

---

# 7. Rust 类型设计

```rust
// crates/sqlgui-extension/src/security/types.rs

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChecksumFile {
    pub algorithm: String,
    pub files: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignatureFile {
    pub algorithm: String,
    pub publisher: String,
    pub key_id: String,
    pub signature: String,
    pub signed_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublisherKey {
    pub key_id: String,
    pub algorithm: String,
    pub public_key: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrustedPublisher {
    pub publisher: String,
    pub display_name: Option<String>,
    pub trusted: bool,
    pub keys: Vec<PublisherKey>,
    pub trusted_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SignatureStatus {
    Verified,
    Unsigned,
    Invalid,
    Untrusted,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginVerificationResult {
    pub status: SignatureStatus,
    pub publisher: Option<String>,
    pub key_id: Option<String>,
    pub message: Option<String>,
    pub checksums_valid: bool,
    pub signature_valid: bool,
    pub publisher_trusted: bool,
}
```

---

# 8. Rust checksum 校验

```rust
// crates/sqlgui-extension/src/security/checksum.rs

use crate::security::types::ChecksumFile;
use anyhow::{anyhow, Result};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::Path;

pub const CHECKSUM_FILE: &str = "checksums.json";
pub const SIGNATURE_FILE: &str = "signature.sig";

pub fn read_checksums(extension_dir: &Path) -> Result<ChecksumFile> {
    let path = extension_dir.join(CHECKSUM_FILE);

    if !path.exists() {
        return Err(anyhow!("Missing checksums.json"));
    }

    let content = fs::read_to_string(path)?;
    let checksums: ChecksumFile = serde_json::from_str(&content)?;

    if checksums.algorithm != "sha256" {
        return Err(anyhow!("Unsupported checksum algorithm"));
    }

    Ok(checksums)
}

pub fn verify_checksums(extension_dir: &Path, checksums: &ChecksumFile) -> Result<()> {
    for (relative_path, expected_hash) in &checksums.files {
        if relative_path.contains("..") {
            return Err(anyhow!("Invalid checksum path"));
        }

        if relative_path == CHECKSUM_FILE || relative_path == SIGNATURE_FILE {
            continue;
        }

        let file_path = extension_dir.join(relative_path);

        if !file_path.exists() {
            return Err(anyhow!("Missing file listed in checksums: {}", relative_path));
        }

        let actual_hash = sha256_file(&file_path)?;

        if &actual_hash != expected_hash {
            return Err(anyhow!("Checksum mismatch: {}", relative_path));
        }
    }

    Ok(())
}

pub fn sha256_file(path: &Path) -> Result<String> {
    let bytes = fs::read(path)?;
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let result = hasher.finalize();

    Ok(format!("{:x}", result))
}

pub fn sha256_bytes(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let result = hasher.finalize();

    format!("{:x}", result)
}
```

---

# 9. Rust Trust Store

```rust
// crates/sqlgui-extension/src/security/trust.rs

use crate::security::types::TrustedPublisher;
use anyhow::Result;
use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;

#[derive(Clone)]
pub struct TrustStore {
    path: PathBuf,
}

impl TrustStore {
    pub fn new(path: PathBuf) -> Self {
        Self { path }
    }

    pub fn load(&self) -> Result<BTreeMap<String, TrustedPublisher>> {
        if !self.path.exists() {
            return Ok(BTreeMap::new());
        }

        let content = fs::read_to_string(&self.path)?;
        let publishers = serde_json::from_str(&content)?;

        Ok(publishers)
    }

    pub fn save(
        &self,
        publishers: &BTreeMap<String, TrustedPublisher>,
    ) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }

        let content = serde_json::to_string_pretty(publishers)?;
        fs::write(&self.path, content)?;

        Ok(())
    }

    pub fn get_key(
        &self,
        publisher: &str,
        key_id: &str,
    ) -> Result<Option<String>> {
        let publishers = self.load()?;

        let Some(item) = publishers.get(publisher) else {
            return Ok(None);
        };

        if !item.trusted {
            return Ok(None);
        }

        let Some(key) = item.keys.iter().find(|key| key.key_id == key_id) else {
            return Ok(None);
        };

        Ok(Some(key.public_key.clone()))
    }

    pub fn upsert(&self, publisher: TrustedPublisher) -> Result<()> {
        let mut publishers = self.load()?;
        publishers.insert(publisher.publisher.clone(), publisher);
        self.save(&publishers)
    }

    pub fn revoke(&self, publisher: &str) -> Result<()> {
        let mut publishers = self.load();

        let mut publishers = publishers?;
        if let Some(item) = publishers.get_mut(publisher) {
            item.trusted = false;
        }

        self.save(&publishers)
    }
}
```

---

# 10. Rust Ed25519 签名校验

依赖：

```toml
# crates/sqlgui-extension/Cargo.toml

ed25519-dalek = "2"
base64 = "0.22"
```

代码：

```rust
// crates/sqlgui-extension/src/security/signature.rs

use crate::security::types::SignatureFile;
use anyhow::{anyhow, Result};
use base64::{engine::general_purpose, Engine as _};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use std::fs;
use std::path::Path;

pub const SIGNATURE_FILE: &str = "signature.sig";
pub const CHECKSUM_FILE: &str = "checksums.json";

pub fn read_signature(extension_dir: &Path) -> Result<SignatureFile> {
    let path = extension_dir.join(SIGNATURE_FILE);

    if !path.exists() {
        return Err(anyhow!("Missing signature.sig"));
    }

    let content = fs::read_to_string(path)?;
    let signature: SignatureFile = serde_json::from_str(&content)?;

    if signature.algorithm != "ed25519" {
        return Err(anyhow!("Unsupported signature algorithm"));
    }

    Ok(signature)
}

pub fn verify_signature(
    extension_dir: &Path,
    signature_file: &SignatureFile,
    public_key_base64: &str,
) -> Result<()> {
    let checksum_bytes = fs::read(extension_dir.join(CHECKSUM_FILE))?;

    let public_key_bytes = general_purpose::STANDARD.decode(public_key_base64)?;
    let signature_bytes = general_purpose::STANDARD.decode(&signature_file.signature)?;

    let public_key_array: [u8; 32] = public_key_bytes
        .try_into()
        .map_err(|_| anyhow!("Invalid Ed25519 public key length"))?;

    let signature_array: [u8; 64] = signature_bytes
        .try_into()
        .map_err(|_| anyhow!("Invalid Ed25519 signature length"))?;

    let verifying_key = VerifyingKey::from_bytes(&public_key_array)?;
    let signature = Signature::from_bytes(&signature_array);

    verifying_key
        .verify(&checksum_bytes, &signature)
        .map_err(|err| anyhow!("Signature verification failed: {}", err))?;

    Ok(())
}
```

---

# 11. Rust Package Verify

```rust
// crates/sqlgui-extension/src/security/package_verify.rs

use crate::security::checksum::{read_checksums, verify_checksums};
use crate::security::signature::{read_signature, verify_signature};
use crate::security::trust::TrustStore;
use crate::security::types::{PluginVerificationResult, SignatureStatus};
use anyhow::Result;
use std::path::Path;

pub fn verify_extension_package_dir(
    extension_dir: &Path,
    trust_store: &TrustStore,
    allow_unsigned: bool,
) -> PluginVerificationResult {
    let checksums = match read_checksums(extension_dir) {
        Ok(value) => value,
        Err(err) => {
            if allow_unsigned {
                return PluginVerificationResult {
                    status: SignatureStatus::Unsigned,
                    publisher: None,
                    key_id: None,
                    message: Some(err.to_string()),
                    checksums_valid: false,
                    signature_valid: false,
                    publisher_trusted: false,
                };
            }

            return PluginVerificationResult {
                status: SignatureStatus::Invalid,
                publisher: None,
                key_id: None,
                message: Some(err.to_string()),
                checksums_valid: false,
                signature_valid: false,
                publisher_trusted: false,
            };
        }
    };

    if let Err(err) = verify_checksums(extension_dir, &checksums) {
        return PluginVerificationResult {
            status: SignatureStatus::Invalid,
            publisher: None,
            key_id: None,
            message: Some(err.to_string()),
            checksums_valid: false,
            signature_valid: false,
            publisher_trusted: false,
        };
    }

    let signature = match read_signature(extension_dir) {
        Ok(value) => value,
        Err(err) => {
            if allow_unsigned {
                return PluginVerificationResult {
                    status: SignatureStatus::Unsigned,
                    publisher: None,
                    key_id: None,
                    message: Some(err.to_string()),
                    checksums_valid: true,
                    signature_valid: false,
                    publisher_trusted: false,
                };
            }

            return PluginVerificationResult {
                status: SignatureStatus::Invalid,
                publisher: None,
                key_id: None,
                message: Some(err.to_string()),
                checksums_valid: true,
                signature_valid: false,
                publisher_trusted: false,
            };
        }
    };

    let key = match trust_store.get_key(&signature.publisher, &signature.key_id) {
        Ok(Some(key)) => key,
        Ok(None) => {
            return PluginVerificationResult {
                status: SignatureStatus::Untrusted,
                publisher: Some(signature.publisher),
                key_id: Some(signature.key_id),
                message: Some("Publisher is not trusted".to_string()),
                checksums_valid: true,
                signature_valid: false,
                publisher_trusted: false,
            };
        }
        Err(err) => {
            return PluginVerificationResult {
                status: SignatureStatus::Unknown,
                publisher: Some(signature.publisher),
                key_id: Some(signature.key_id),
                message: Some(err.to_string()),
                checksums_valid: true,
                signature_valid: false,
                publisher_trusted: false,
            };
        }
    };

    match verify_signature(extension_dir, &signature, &key) {
        Ok(()) => PluginVerificationResult {
            status: SignatureStatus::Verified,
            publisher: Some(signature.publisher),
            key_id: Some(signature.key_id),
            message: None,
            checksums_valid: true,
            signature_valid: true,
            publisher_trusted: true,
        },
        Err(err) => PluginVerificationResult {
            status: SignatureStatus::Invalid,
            publisher: Some(signature.publisher),
            key_id: Some(signature.key_id),
            message: Some(err.to_string()),
            checksums_valid: true,
            signature_valid: false,
            publisher_trusted: true,
        },
    }
}
```

---

# 12. 安装器接入签名校验

给安装请求增加安全选项：

```rust
// crates/sqlgui-extension/src/types.rs

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallSecurityOptions {
    pub allow_unsigned: Option<bool>,
    pub allow_untrusted: Option<bool>,
    pub allow_invalid_signature: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallFromPackageRequest {
    pub package_path: String,
    pub overwrite: Option<bool>,
    pub security: Option<InstallSecurityOptions>,
}
```

安装时：

```rust
// crates/sqlgui-extension/src/installer.rs

use crate::security::package_verify::verify_extension_package_dir;
use crate::security::trust::TrustStore;
use crate::security::types::SignatureStatus;

// install_from_package 内部，在解压 temp 后、复制 target 前：

let trust_store = TrustStore::new(self.app_data_dir.join("trusted-publishers.json"));

let security = request.security.clone();
let allow_unsigned = security
    .as_ref()
    .and_then(|item| item.allow_unsigned)
    .unwrap_or(false);

let allow_untrusted = security
    .as_ref()
    .and_then(|item| item.allow_untrusted)
    .unwrap_or(false);

let allow_invalid_signature = security
    .as_ref()
    .and_then(|item| item.allow_invalid_signature)
    .unwrap_or(false);

let verification =
    verify_extension_package_dir(temp.path(), &trust_store, allow_unsigned);

match verification.status {
    SignatureStatus::Verified => {}
    SignatureStatus::Unsigned => {
        if !allow_unsigned {
            anyhow::bail!("Unsigned extension package is not allowed");
        }
    }
    SignatureStatus::Untrusted => {
        if !allow_untrusted {
            anyhow::bail!("Untrusted extension publisher");
        }
    }
    SignatureStatus::Invalid => {
        if !allow_invalid_signature {
            anyhow::bail!("Invalid extension signature");
        }
    }
    SignatureStatus::Unknown => {
        anyhow::bail!(
            "Unable to verify extension package: {}",
            verification.message.unwrap_or_default()
        );
    }
}
```

推荐策略：

```txt
普通安装：
- unsigned 需要用户确认
- untrusted 需要用户确认或信任 publisher
- invalid 直接拒绝，不建议允许
```

---

# 13. Tauri Trust Commands

```rust
// apps/desktop/src-tauri/src/commands/extension_security.rs

use sqlgui_extension::security::trust::TrustStore;
use sqlgui_extension::security::types::TrustedPublisher;
use tauri::{AppHandle, Manager};

fn trust_store(app: &AppHandle) -> Result<TrustStore, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|err| err.to_string())?;

    Ok(TrustStore::new(app_data_dir.join("trusted-publishers.json")))
}

#[tauri::command]
pub async fn extension_list_trusted_publishers(
    app: AppHandle,
) -> Result<Vec<TrustedPublisher>, String> {
    let store = trust_store(&app)?;
    let publishers = store.load().map_err(|err| err.to_string())?;

    Ok(publishers.into_values().collect())
}

#[tauri::command]
pub async fn extension_trust_publisher(
    app: AppHandle,
    publisher: TrustedPublisher,
) -> Result<(), String> {
    trust_store(&app)?
        .upsert(publisher)
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn extension_revoke_publisher(
    app: AppHandle,
    publisher: String,
) -> Result<(), String> {
    trust_store(&app)?
        .revoke(&publisher)
        .map_err(|err| err.to_string())
}
```

---

# 14. 前端 TrustService

```ts
// apps/desktop/src/plugins/security/trustService.ts

import { callNative } from '@/services/native/invoke';
import type { TrustedPublisher } from './types';

export const trustService = {
  listTrustedPublishers() {
    return callNative<TrustedPublisher[]>('extension_list_trusted_publishers');
  },

  trustPublisher(publisher: TrustedPublisher) {
    return callNative<void>('extension_trust_publisher', {
      publisher,
    });
  },

  revokePublisher(publisher: string) {
    return callNative<void>('extension_revoke_publisher', {
      publisher,
    });
  },
};
```

---

# 15. 安装策略服务

```ts
// apps/desktop/src/plugins/security/PluginInstallPolicy.ts

import type { SignatureStatus } from './types';

export interface InstallPolicyDecision {
  allow: boolean;
  allowUnsigned?: boolean;
  allowUntrusted?: boolean;
  allowInvalidSignature?: boolean;
  reason?: string;
}

class PluginInstallPolicy {
  decide(status: SignatureStatus): InstallPolicyDecision {
    if (status === 'verified') {
      return { allow: true };
    }

    if (status === 'unsigned') {
      return {
        allow: false,
        allowUnsigned: false,
        reason: 'Extension package is unsigned.',
      };
    }

    if (status === 'untrusted') {
      return {
        allow: false,
        allowUntrusted: false,
        reason: 'Extension publisher is not trusted.',
      };
    }

    if (status === 'invalid') {
      return {
        allow: false,
        allowInvalidSignature: false,
        reason: 'Extension signature is invalid.',
      };
    }

    return {
      allow: false,
      reason: 'Unable to verify extension package.',
    };
  }
}

export const pluginInstallPolicy = new PluginInstallPolicy();
```

MVP 也可以直接在 UI 里决定是否允许 unsigned/untrusted。

---

# 16. 前端安装请求升级

```ts
// apps/desktop/src/plugins/services/extensionInstallerService.ts

export const extensionInstallerService = {
  installFromPackage(input: {
    packagePath: string;
    overwrite?: boolean;
    security?: {
      allowUnsigned?: boolean;
      allowUntrusted?: boolean;
      allowInvalidSignature?: boolean;
    };
  }) {
    return callNative<ExtensionInstallResult>('extension_install_from_package', {
      request: {
        packagePath: input.packagePath,
        overwrite: input.overwrite,
        security: input.security,
      },
    });
  },
};
```

---

# 17. Marketplace 安装接入安全确认

```ts
// apps/desktop/src/plugins/marketplace/services/marketplaceInstallService.ts

await extensionService.installFromPackage(packagePath, {
  allowUnsigned: extension.signatureStatus === 'unsigned' && userConfirmed,
  allowUntrusted: extension.signatureStatus === 'untrusted' && userConfirmed,
});
```

可以先改 `extensionService`：

```ts
// apps/desktop/src/plugins/services/extensionService.ts

async installFromPackage(
  packagePath: string,
  security?: {
    allowUnsigned?: boolean
    allowUntrusted?: boolean
    allowInvalidSignature?: boolean
  },
) {
  await extensionInstallerService.installFromPackage({
    packagePath,
    overwrite: true,
    security,
  })

  await this.reloadExtensions()
}
```

---

# 18. SignatureBadge

```tsx
// apps/desktop/src/plugins/security/components/SignatureBadge.tsx

import type { SignatureStatus } from '../types';

export function SignatureBadge(props: { status?: SignatureStatus }) {
  const status = props.status ?? 'unknown';

  return <span className={getClassName(status)}>{getText(status)}</span>;
}

function getText(status: SignatureStatus) {
  if (status === 'verified') return 'Verified';
  if (status === 'unsigned') return 'Unsigned';
  if (status === 'invalid') return 'Invalid Signature';
  if (status === 'untrusted') return 'Untrusted';
  return 'Unknown';
}

function getClassName(status: SignatureStatus) {
  const base = 'rounded px-1.5 py-0.5 text-[10px] uppercase';

  if (status === 'verified') {
    return `${base} bg-green-500/10 text-green-600`;
  }

  if (status === 'unsigned') {
    return `${base} bg-yellow-500/10 text-yellow-600`;
  }

  if (status === 'untrusted') {
    return `${base} bg-orange-500/10 text-orange-600`;
  }

  if (status === 'invalid') {
    return `${base} bg-red-500/10 text-red-600`;
  }

  return `${base} bg-muted text-muted-foreground`;
}
```

---

# 19. MarketplaceExtension 类型增加签名状态

```ts
// apps/desktop/src/plugins/marketplace/types.ts

import type { SignatureStatus } from '@/plugins/security/types';

export interface MarketplaceExtension {
  id: string;
  name: string;
  displayName: string;
  publisher: string;
  version: string;
  description: string;

  signatureStatus?: SignatureStatus;
  trustedPublisher?: boolean;

  // 其他字段不变
}
```

Mock 数据：

```json
{
  "id": "baicie.sql-formatter-demo",
  "signatureStatus": "verified",
  "trustedPublisher": true
}
```

卡片显示：

```tsx
<SignatureBadge status={extension.signatureStatus} />
```

---

# 20. 未签名安装警告弹窗

```tsx
// apps/desktop/src/plugins/security/components/UnsignedInstallWarningDialog.tsx

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function UnsignedInstallWarningDialog(props: {
  open: boolean;
  extensionName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Install unsigned extension?</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Extension <b>{props.extensionName}</b> is not signed.
          </p>
          <p>
            Unsigned extensions may have been modified or may not come from a trusted publisher.
            Only install it if you trust the source.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={props.onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={props.onConfirm}>
            Install Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

# 21. Pack 脚本升级：生成 checksums.json

```ts
// scripts/pack-extension.ts 核心补充

import crypto from 'node:crypto';

function collectFiles(sourceDir: string) {
  const files: string[] = [];

  function walk(dir: string) {
    for (const item of fs.readdirSync(dir)) {
      const absolute = path.join(dir, item);
      const relative = path.relative(sourceDir, absolute).replaceAll('\\', '/');

      if (shouldIgnore(relative)) continue;

      if (fs.statSync(absolute).isDirectory()) {
        walk(absolute);
      } else {
        files.push(relative);
      }
    }
  }

  walk(sourceDir);

  return files;
}

function generateChecksums(sourceDir: string) {
  const files = collectFiles(sourceDir);
  const result: Record<string, string> = {};

  for (const file of files) {
    if (file === 'checksums.json' || file === 'signature.sig') continue;

    const bytes = fs.readFileSync(path.join(sourceDir, file));
    result[file] = crypto.createHash('sha256').update(bytes).digest('hex');
  }

  return {
    algorithm: 'sha256',
    files: result,
  };
}

function writeChecksums(sourceDir: string) {
  const checksums = generateChecksums(sourceDir);
  fs.writeFileSync(path.join(sourceDir, 'checksums.json'), JSON.stringify(checksums, null, 2));
}
```

打包前：

```ts
writeChecksums(absoluteDir);
await zipDirectory(absoluteDir, outPath);
```

---

# 22. 生成 Ed25519 key 脚本

用 Node 内置 crypto：

```ts
// scripts/generate-extension-key.ts

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const publisher = process.argv[2];

if (!publisher) {
  console.error('Usage: tsx scripts/generate-extension-key.ts <publisher>');
  process.exit(1);
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

const outDir = path.resolve('.sqlgui-keys', publisher);
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, 'private.pem'),
  privateKey.export({
    type: 'pkcs8',
    format: 'pem',
  }),
);

fs.writeFileSync(
  path.join(outDir, 'public.pem'),
  publicKey.export({
    type: 'spki',
    format: 'pem',
  }),
);

const publicDer = publicKey.export({
  type: 'spki',
  format: 'der',
});

fs.writeFileSync(
  path.join(outDir, 'publisher-key.json'),
  JSON.stringify(
    {
      publisher,
      keyId: `${publisher}.default`,
      algorithm: 'ed25519',
      publicKeyDerBase64: publicDer.toString('base64'),
      createdAt: Date.now(),
    },
    null,
    2,
  ),
);

console.log(`Generated key pair: ${outDir}`);
```

注意：Rust `ed25519-dalek` 需要 raw 32-byte public key，不是 SPKI DER。更简单的方式是使用 `@noble/ed25519` 生成 raw key。推荐换这个。

```bash
pnpm add -D @noble/ed25519
```

```ts
// scripts/generate-extension-key.ts

import * as ed from '@noble/ed25519';
import { bytesToHex } from '@noble/hashes/utils';
import fs from 'node:fs';
import path from 'node:path';

const publisher = process.argv[2];

if (!publisher) {
  throw new Error('Usage: tsx scripts/generate-extension-key.ts <publisher>');
}

const privateKey = ed.utils.randomPrivateKey();
const publicKey = await ed.getPublicKeyAsync(privateKey);

const outDir = path.resolve('.sqlgui-keys', publisher);
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, 'private-key.json'),
  JSON.stringify(
    {
      publisher,
      keyId: `${publisher}.default`,
      algorithm: 'ed25519',
      privateKey: Buffer.from(privateKey).toString('base64'),
      publicKey: Buffer.from(publicKey).toString('base64'),
      createdAt: Date.now(),
    },
    null,
    2,
  ),
);

fs.writeFileSync(
  path.join(outDir, 'publisher-key.json'),
  JSON.stringify(
    {
      publisher,
      keyId: `${publisher}.default`,
      algorithm: 'ed25519',
      publicKey: Buffer.from(publicKey).toString('base64'),
      createdAt: Date.now(),
    },
    null,
    2,
  ),
);

console.log(`Generated keys in ${outDir}`);
```

---

# 23. Sign 脚本

```ts
// scripts/sign-extension.ts

import * as ed from '@noble/ed25519';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const extensionDir = process.argv[2];
  const keyPath = process.argv[3];

  if (!extensionDir || !keyPath) {
    throw new Error('Usage: tsx scripts/sign-extension.ts <extension-dir> <private-key-json>');
  }

  const absoluteDir = path.resolve(extensionDir);
  const privateKeyFile = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));

  const checksumsPath = path.join(absoluteDir, 'checksums.json');

  if (!fs.existsSync(checksumsPath)) {
    throw new Error('Missing checksums.json. Run pack script first.');
  }

  const checksumsBytes = fs.readFileSync(checksumsPath);
  const privateKey = Buffer.from(privateKeyFile.privateKey, 'base64');

  const signature = await ed.signAsync(checksumsBytes, privateKey);

  const signatureFile = {
    algorithm: 'ed25519',
    publisher: privateKeyFile.publisher,
    keyId: privateKeyFile.keyId,
    signature: Buffer.from(signature).toString('base64'),
    signedAt: Date.now(),
  };

  fs.writeFileSync(path.join(absoluteDir, 'signature.sig'), JSON.stringify(signatureFile, null, 2));

  console.log('Signed extension.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

---

# 24. 推荐打包顺序

```bash
pnpm --filter sqlgui-extension-sql-formatter-demo build

pnpm extension:checksum extensions/sql-formatter-demo

pnpm extension:sign extensions/sql-formatter-demo .sqlgui-keys/baicie/private-key.json

pnpm sqlgui:pack extensions/sql-formatter-demo
```

也可以合并成：

```bash
pnpm sqlgui:pack --sign --key .sqlgui-keys/baicie/private-key.json extensions/sql-formatter-demo
```

MVP 先分开，清晰。

---

# 25. package.json scripts

```json
{
  "scripts": {
    "extension:keygen": "tsx scripts/generate-extension-key.ts",
    "extension:sign": "tsx scripts/sign-extension.ts",
    "sqlgui:pack": "tsx scripts/pack-extension.ts"
  }
}
```

---

# 26. 安全审计日志

```ts
// apps/desktop/src/plugins/security/PluginSecurityAuditService.ts

export interface PluginSecurityAuditItem {
  id: string;
  type:
    | 'install.verified'
    | 'install.unsigned'
    | 'install.untrusted'
    | 'install.invalid'
    | 'publisher.trusted'
    | 'publisher.revoked';
  extensionId?: string;
  publisher?: string;
  message?: string;
  createdAt: number;
}

class PluginSecurityAuditService {
  private items: PluginSecurityAuditItem[] = [];

  record(item: Omit<PluginSecurityAuditItem, 'id' | 'createdAt'>) {
    this.items.push({
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      ...item,
    });

    if (this.items.length > 1000) {
      this.items = this.items.slice(-1000);
    }
  }

  getItems() {
    return this.items;
  }

  clear() {
    this.items = [];
  }
}

export const pluginSecurityAuditService = new PluginSecurityAuditService();
```

---

# 27. Marketplace UI 接入签名展示

在 `MarketplaceExtensionCard` 里加：

```tsx
import { SignatureBadge } from '@/plugins/security/components/SignatureBadge';

<SignatureBadge status={extension.signatureStatus} />;
```

详情页：

```tsx
<section className="rounded-md border p-3">
  <h3 className="mb-2 text-sm font-medium">Security</h3>
  <div className="flex items-center gap-2">
    <SignatureBadge status={extension.signatureStatus} />
    <span className="text-xs text-muted-foreground">Publisher: {extension.publisher}</span>
  </div>
</section>
```

---

# 28. 安装策略 UI 流程

```txt
用户点击 Install
  ↓
如果 verified
  ↓
直接安装

如果 unsigned
  ↓
UnsignedInstallWarningDialog
  ↓
用户 Install Anyway
  ↓
installFromPackage({ allowUnsigned: true })

如果 untrusted
  ↓
TrustPublisherDialog
  ↓
用户 Trust and Install
  ↓
写 trusted-publishers.json
  ↓
installFromPackage({ allowUntrusted: true }) 或重新校验 verified

如果 invalid
  ↓
SignatureInvalidDialog
  ↓
只允许 Cancel
```

---

# 29. TrustPublisherDialog

```tsx
// apps/desktop/src/plugins/security/components/TrustPublisherDialog.tsx

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function TrustPublisherDialog(props: {
  open: boolean;
  publisher: string;
  onTrust: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trust publisher?</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Publisher <b>{props.publisher}</b> is not trusted yet.
          </p>
          <p>Only trust publishers if you understand the source of this plugin.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={props.onCancel}>
            Cancel
          </Button>
          <Button onClick={props.onTrust}>Trust Publisher</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

# 30. SignatureInvalidDialog

```tsx
// apps/desktop/src/plugins/security/components/SignatureInvalidDialog.tsx

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function SignatureInvalidDialog(props: {
  open: boolean;
  extensionName: string;
  message?: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invalid extension signature</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Extension <b>{props.extensionName}</b> has an invalid signature.
          </p>
          <p>
            This may mean the package was modified after publishing. Installation has been blocked.
          </p>

          {props.message ? (
            <pre className="rounded bg-muted p-2 text-xs">{props.message}</pre>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={props.onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

# 31. Phase 14 开发顺序

```txt
1. 定义 checksums.json / signature.sig 格式
2. Rust 增加 checksum 校验
3. Rust 增加 TrustStore
4. Rust 增加 Ed25519 signature 校验
5. Rust install_from_package 接入 verify
6. Tauri 增加 trust publisher commands
7. 前端增加 security/types.ts
8. 前端增加 trustService
9. 前端安装请求支持 security options
10. Marketplace 类型增加 signatureStatus
11. Marketplace 卡片/详情展示 SignatureBadge
12. 增加 unsigned / untrusted / invalid 安装弹窗
13. pack-extension 生成 checksums.json
14. generate-extension-key 生成 key
15. sign-extension 生成 signature.sig
16. 准备 signed demo .sgx
17. 测试 verified 安装
18. 测试 unsigned 安装警告
19. 测试 invalid signature 阻止安装
20. 测试 untrusted publisher 流程
```

---

# 32. 测试用例

## Rust 测试

```txt
[ ] 缺少 checksums.json -> unsigned / invalid
[ ] checksum mismatch -> invalid
[ ] 缺少 signature.sig -> unsigned
[ ] 未信任 publisher -> untrusted
[ ] public key 错误 -> invalid
[ ] signature 正确 -> verified
[ ] .sgx 路径穿越仍然拒绝
[ ] allowUnsigned = true 时允许未签名
[ ] allowInvalidSignature = false 时拒绝无效签名
```

## 前端手动测试

```txt
[ ] Marketplace 显示 Verified Badge
[ ] 未签名插件显示 Unsigned Badge
[ ] 安装 unsigned 弹风险确认
[ ] 拒绝后不安装
[ ] Install Anyway 后安装
[ ] invalid 插件弹阻止安装
[ ] untrusted publisher 弹信任确认
[ ] trusted-publishers.json 写入成功
[ ] 再次安装同 publisher 不再提示 untrusted
```

---

# 33. Phase 14 完成标准

```txt
[ ] .sgx 支持 checksums.json
[ ] .sgx 支持 signature.sig
[ ] 打包脚本能生成 checksums
[ ] 签名脚本能生成 signature
[ ] Rust 能校验文件完整性
[ ] Rust 能校验 Ed25519 签名
[ ] Rust 能识别 unsigned / invalid / untrusted / verified
[ ] 安装器接入签名校验
[ ] trusted-publishers.json 可读写
[ ] Marketplace 展示签名状态
[ ] 未签名插件安装有风险确认
[ ] 无效签名插件默认阻止安装
[ ] 开发模式可允许 unsigned
[ ] 安装安全审计日志可记录
```

---

# 34. 最小闭环

```txt
生成 key
  ↓
pnpm extension:keygen baicie
  ↓
构建插件
  ↓
生成 checksums.json
  ↓
签名 signature.sig
  ↓
打包 .sgx
  ↓
Marketplace 显示 Verified
  ↓
点击 Install
  ↓
Rust 校验 checksums
  ↓
Rust 校验 signature
  ↓
publisher trusted
  ↓
安装成功
  ↓
插件命令可用
```

---

# 35. Phase 14 的核心价值

Phase 14 做完后，你的插件系统就从：

```txt
能安装插件
```

升级成：

```txt
能安全地安装插件
```

它解决的是插件生态必须面对的问题：

```txt
插件包有没有被篡改？
发布者是谁？
这个发布者是否可信？
未签名插件是否应该提醒？
无效签名是否应该阻止？
```

后续 Phase 15 如果要做真实远程市场，就可以直接复用：

```txt
remotePackage 下载
  ↓
sha256 校验
  ↓
signature 校验
  ↓
publisher trust
  ↓
本地安装
```

所以 Phase 14 是从“本地玩具市场”走向“真实插件生态”的关键安全层。
