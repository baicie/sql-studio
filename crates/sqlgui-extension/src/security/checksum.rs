use crate::security::types::ChecksumFile;
use anyhow::{anyhow, Result};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::Path;

pub const CHECKSUM_FILE: &str = "checksums.json";
pub const SIGNATURE_FILE: &str = "signature.sig";

pub fn read_checksums(extension_dir: &Path) -> Result<ChecksumFile> {
    let path = extension_dir.join(CHECKSUM_FILE);

    if !path.exists() {
        return Err(anyhow!("Missing checksums.json"));
    }

    let content = fs::read_to_string(path)?;
    let checksums: ChecksumFile = serde_json::from_str(&content)?;

    if checksums.algorithm != "sha256" {
        return Err(anyhow!("Unsupported checksum algorithm"));
    }

    Ok(checksums)
}

pub fn verify_checksums(extension_dir: &Path, checksums: &ChecksumFile) -> Result<()> {
    for (relative_path, expected_hash) in &checksums.files {
        if relative_path.contains("..") {
            return Err(anyhow!("Invalid checksum path"));
        }

        if relative_path == CHECKSUM_FILE || relative_path == SIGNATURE_FILE {
            continue;
        }

        let file_path = extension_dir.join(relative_path);

        if !file_path.exists() {
            return Err(anyhow!("Missing file listed in checksums: {}", relative_path));
        }

        let actual_hash = sha256_file(&file_path)?;

        if &actual_hash != expected_hash {
            return Err(anyhow!("Checksum mismatch: {}", relative_path));
        }
    }

    Ok(())
}

pub fn sha256_file(path: &Path) -> Result<String> {
    let bytes = fs::read(path)?;
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let result = hasher.finalize();

    Ok(format!("{:x}", result))
}

pub fn sha256_bytes(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let result = hasher.finalize();

    format!("{:x}", result)
}
