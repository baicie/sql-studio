use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use sqlgui_extension::scanner::{scan_extensions, ExtensionScanResult};

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
