mod commands;
mod state;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(state::AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::system::system_health_check,
            commands::db::db_test_connection,
            commands::db::db_open_connection,
            commands::db::db_close_connection,
            commands::db::db_execute_query,
            commands::db::db_list_databases,
            commands::db::db_list_schemas,
            commands::db::db_list_tables,
            commands::db::db_list_columns,
            commands::extension::extension_scan,
        commands::extension::extension_read_entry,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.open_devtools();
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running sqlgui");
}
