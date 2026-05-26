use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

const MANIFEST_FILE: &str = "sqlgui.extension.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionManifestFile {
    pub extension_path: String,
    pub manifest_path: String,
    pub manifest: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionScanResult {
    pub extensions: Vec<ExtensionManifestFile>,
    pub errors: Vec<ExtensionScanError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionScanError {
    pub path: String,
    pub message: String,
}

pub fn scan_extensions(dirs: Vec<PathBuf>) -> ExtensionScanResult {
    let mut extensions = Vec::new();
    let mut errors = Vec::new();

    for dir in dirs {
        let result = scan_directory(&dir, 2);
        extensions.extend(result.extensions);
        errors.extend(result.errors);
    }

    ExtensionScanResult { extensions, errors }
}

fn scan_directory(dir: &Path, depth: usize) -> ExtensionScanResult {
    let mut extensions = Vec::new();
    let mut errors = Vec::new();

    if !dir.exists() {
        return ExtensionScanResult { extensions, errors };
    }

    let manifest_path = dir.join(MANIFEST_FILE);

    if manifest_path.exists() {
        match read_manifest(dir, &manifest_path) {
            Ok(manifest) => extensions.push(manifest),
            Err(err) => {
                errors.push(ExtensionScanError {
                    path: dir.to_string_lossy().to_string(),
                    message: err.to_string(),
                });
            }
        }

        return ExtensionScanResult { extensions, errors };
    }

    if depth == 0 {
        return ExtensionScanResult { extensions, errors };
    }

    let entries = match std::fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(err) => {
            errors.push(ExtensionScanError {
                path: dir.to_string_lossy().to_string(),
                message: err.to_string(),
            });
            return ExtensionScanResult { extensions, errors };
        }
    };

    for entry in entries.flatten() {
        let path = entry.path();

        if !path.is_dir() {
            continue;
        }

        let result = scan_directory(&path, depth - 1);
        extensions.extend(result.extensions);
        errors.extend(result.errors);
    }

    ExtensionScanResult { extensions, errors }
}

fn read_manifest(
    extension_path: &Path,
    manifest_path: &Path,
) -> Result<ExtensionManifestFile> {
    let content = std::fs::read_to_string(manifest_path)?;
    let manifest = serde_json::from_str::<serde_json::Value>(&content)?;

    Ok(ExtensionManifestFile {
        extension_path: extension_path.to_string_lossy().to_string(),
        manifest_path: manifest_path.to_string_lossy().to_string(),
        manifest,
    })
}
