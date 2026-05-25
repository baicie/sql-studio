use serde::Serialize;
use tauri::State;

use crate::state::AppState;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthCheckResponse {
    pub app_name: String,
    pub rust_core_ready: bool,
}

#[tauri::command]
pub async fn system_health_check(
    state: State<'_, AppState>,
) -> Result<HealthCheckResponse, String> {
    let rust_core_ready =
        sqlgui_db::db_core_ready() && sqlgui_extension::extension_core_ready();

    Ok(HealthCheckResponse {
        app_name: state.app_name.clone(),
        rust_core_ready,
    })
}
