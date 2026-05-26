use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallFromFolderRequest {
    pub folder_path: String,
    pub mode: FolderInstallMode,
    pub overwrite: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
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
