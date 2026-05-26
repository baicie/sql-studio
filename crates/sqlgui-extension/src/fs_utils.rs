use anyhow::{anyhow, Result};
use std::fs;
use std::path::Path;

pub fn copy_dir_recursive(from: &Path, to: &Path) -> Result<()> {
    if !from.exists() {
        return Err(anyhow!("Source directory does not exist"));
    }

    fs::create_dir_all(to)?;

    for entry in fs::read_dir(from)? {
        let entry = entry?;
        let source = entry.path();
        let target = to.join(entry.file_name());

        if source.is_dir() {
            copy_dir_recursive(&source, &target)?;
        } else {
            fs::copy(&source, &target)?;
        }
    }

    Ok(())
}

pub fn remove_dir_if_exists(path: &Path) -> Result<()> {
    if path.exists() {
        fs::remove_dir_all(path)?;
    }

    Ok(())
}

pub fn ensure_safe_child_path(parent: &Path, child: &Path) -> Result<()> {
    let parent = parent.canonicalize()?;
    let child = child.canonicalize()?;

    if !child.starts_with(parent) {
        return Err(anyhow!("Path escapes parent directory"));
    }

    Ok(())
}
