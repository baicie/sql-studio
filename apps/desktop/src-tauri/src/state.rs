use sqlgui_db::DbManager;

#[derive(Clone)]
pub struct AppState {
    pub app_name: String,
    pub db: DbManager,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            app_name: "sqlgui".to_string(),
            db: DbManager::new(),
        }
    }
}
