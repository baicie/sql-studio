use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use sqlgui_extension::file::read_extension_entry;
use sqlgui_extension::installer::ExtensionInstaller;
use sqlgui_extension::installer_types::{
    ExtensionInstallResult, InstallFromFolderRequest, InstallFromPackageRequest,
    InstalledExtensionRecord, UninstallExtensionRequest,
};
use sqlgui_extension::scanner::{scan_extensions, ExtensionScanResult};
use sqlgui_extension::types::{ExtensionEntryRequest, ExtensionEntrySource};

fn installer(app: &AppHandle) -> Result<ExtensionInstaller, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|err| err.to_string())?;

    Ok(ExtensionInstaller::new(app_data_dir))
}

#[tauri::command]
pub async fn extension_read_entry(
    request: ExtensionEntryRequest,
) -> Result<ExtensionEntrySource, String> {
    let (source, path) =
        read_extension_entry(request.extension_path, &request.main).map_err(|err| err.to_string())?;

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
