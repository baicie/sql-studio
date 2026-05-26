use anyhow::{anyhow, Result};
use std::fs;
use std::path::{Path, PathBuf};

pub fn read_extension_entry(
    extension_path: impl AsRef<Path>,
    main: &str,
) -> Result<(String, PathBuf)> {
    if main.contains("..") {
        return Err(anyhow!("Invalid extension main path"));
    }

    let extension_path = extension_path.as_ref();
    let entry_path = extension_path.join(main);

    if !entry_path.exists() {
        return Err(anyhow!(
            "Extension entry file not found: {}",
            entry_path.display()
        ));
    }

    if !entry_path.starts_with(extension_path) {
        return Err(anyhow!("Extension entry path escapes extension directory"));
    }

    let source = fs::read_to_string(&entry_path)?;

    Ok((source, entry_path))
}
