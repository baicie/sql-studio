use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use sqlgui_extension::file::read_extension_entry;
use sqlgui_extension::scanner::{scan_extensions, ExtensionScanResult};
use sqlgui_extension::types::{ExtensionEntryRequest, ExtensionEntrySource};

#[tauri::command]
pub async fn extension_read_entry(
    request: ExtensionEntryRequest,
) -> Result<ExtensionEntrySource, String> {
    let (source, path) = read_extension_entry(request.extension_path, &request.main)
        .map_err(|err| err.to_string())?;

    Ok(ExtensionEntrySource {
        source,
        path: path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub async fn extension_scan(app: AppHandle) -> Result<ExtensionScanResult, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|err| err.to_string())?;

    let user_extensions_dir = app_data_dir.join("extensions");

    let mut dirs = vec![user_extensions_dir];

    if let Ok(dev_extensions_dir) = std::env::var("SQLGUI_DEV_EXTENSIONS_DIR") {
        dirs.push(PathBuf::from(dev_extensions_dir));
    }

    Ok(scan_extensions(dirs))
}
