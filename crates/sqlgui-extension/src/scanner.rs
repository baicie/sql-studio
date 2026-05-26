use serde::{Deserialize, Serialize};

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

const MANIFEST_FILE: &str = "sqlgui.extension.json";

pub fn scan_extensions(dirs: Vec<std::path::PathBuf>) -> ExtensionScanResult {
    let mut extensions = Vec::new();
    let mut errors = Vec::new();

    for dir in dirs {
        let result = scan_directory(&dir);
        extensions.extend(result.extensions);
        errors.extend(result.errors);
    }

    ExtensionScanResult { extensions, errors }
}

fn scan_directory(dir: &std::path::Path) -> ExtensionScanResult {
    let mut extensions = Vec::new();
    let mut errors = Vec::new();

    if !dir.exists() {
        errors.push(ExtensionScanError {
            path: dir.to_string_lossy().to_string(),
            message: "Directory does not exist".to_string(),
        });
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

        let manifest_path = path.join(MANIFEST_FILE);

        if !manifest_path.exists() {
            continue;
        }

        match read_manifest(&path, &manifest_path) {
            Ok(manifest) => extensions.push(manifest),
            Err(err) => {
                errors.push(ExtensionScanError {
                    path: path.to_string_lossy().to_string(),
                    message: err.to_string(),
                });
            }
        }
    }

    ExtensionScanResult { extensions, errors }
}

fn read_manifest(
    extension_path: &std::path::Path,
    manifest_path: &std::path::Path,
) -> anyhow::Result<ExtensionManifestFile> {
    let content = std::fs::read_to_string(manifest_path)?;
    let manifest = serde_json::from_str::<serde_json::Value>(&content)?;

    Ok(ExtensionManifestFile {
        extension_path: extension_path.to_string_lossy().to_string(),
        manifest_path: manifest_path.to_string_lossy().to_string(),
        manifest,
    })
}
