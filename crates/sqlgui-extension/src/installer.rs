use crate::fs_utils::{copy_dir_recursive, remove_dir_if_exists};
use crate::installer_types::*;
use crate::manifest::read_manifest;
use crate::registry::ExtensionRegistryStore;
use anyhow::{anyhow, Result};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use tempfile::TempDir;
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
                let target = self.extension_version_dir(&extension_id, &manifest.version);

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

        let temp = TempDir::new()?;
        self.extract_package(&package_path, temp.path())?;

        let (manifest, manifest_path) = read_manifest(temp.path())?;
        let extension_id = manifest.id();

        let target = self.extension_version_dir(&extension_id, &manifest.version);

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

    pub fn uninstall(&self, request: UninstallExtensionRequest) -> Result<()> {
        let Some(record) = self.registry.remove(&request.extension_id)? else {
            return Ok(());
        };

        match record.install_type {
            ExtensionInstallType::Package | ExtensionInstallType::FolderCopy => {
                let path = PathBuf::from(record.extension_path);
                remove_dir_if_exists(&path)?;
            }

            ExtensionInstallType::FolderLink | ExtensionInstallType::Builtin => {}
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

    fn extension_version_dir(&self, extension_id: &str, version: &str) -> PathBuf {
        self.app_data_dir
            .join("extensions")
            .join(extension_id)
            .join(version)
    }

    fn extract_package(&self, package_path: &Path, target_dir: &Path) -> Result<()> {
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
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn hash_file(path: &Path) -> Result<String> {
    let bytes = fs::read(path)?;
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let result = hasher.finalize();

    Ok(format!("{:x}", result))
}
