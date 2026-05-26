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
    #[serde(default)]
    pub display_name: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub main: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
}

impl ExtensionManifest {
    pub fn id(&self) -> String {
        format!("{}.{}", self.publisher, self.name)
    }

    pub fn display_name(&self) -> String {
        self.display_name.clone().unwrap_or_else(|| self.name.clone())
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
    if value.is_empty() {
        return false;
    }

    value.chars().all(|ch| ch.is_ascii_lowercase() || ch.is_ascii_digit() || ch == '-')
}
