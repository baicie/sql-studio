use std::path::PathBuf;

#[tauri::command]
pub async fn marketplace_resolve_local_package(path: String) -> Result<String, String> {
    let input = PathBuf::from(&path);

    if input.is_absolute() {
        return Ok(input.to_string_lossy().to_string());
    }

    if let Ok(root) = std::env::var("SQLGUI_REPO_ROOT") {
        let resolved = PathBuf::from(root).join(&input);
        return Ok(resolved.to_string_lossy().to_string());
    }

    let cwd = std::env::current_dir().map_err(|err| err.to_string())?;
    let resolved = cwd.join(input);

    Ok(resolved.to_string_lossy().to_string())
}
