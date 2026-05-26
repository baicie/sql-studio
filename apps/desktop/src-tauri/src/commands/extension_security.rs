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
pub async fn extension_revoke_publisher(app: AppHandle, publisher: String) -> Result<(), String> {
    trust_store(&app)?
        .revoke(&publisher)
        .map_err(|err| err.to_string())
}
