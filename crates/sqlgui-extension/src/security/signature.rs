use crate::security::types::SignatureFile;
use anyhow::{anyhow, Result};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use std::fs;
use std::path::Path;

pub const SIGNATURE_FILE: &str = "signature.sig";
pub const CHECKSUM_FILE: &str = "checksums.json";

pub fn read_signature(extension_dir: &Path) -> Result<SignatureFile> {
    let path = extension_dir.join(SIGNATURE_FILE);

    if !path.exists() {
        return Err(anyhow!("Missing signature.sig"));
    }

    let content = fs::read_to_string(path)?;
    let signature: SignatureFile = serde_json::from_str(&content)?;

    if signature.algorithm != "ed25519" {
        return Err(anyhow!("Unsupported signature algorithm"));
    }

    Ok(signature)
}

pub fn verify_signature(
    extension_dir: &Path,
    signature_file: &SignatureFile,
    public_key_base64: &str,
) -> Result<()> {
    let checksum_bytes = fs::read(extension_dir.join(CHECKSUM_FILE))?;

    let public_key_bytes = STANDARD.decode(public_key_base64)?;
    let signature_bytes = STANDARD.decode(&signature_file.signature)?;

    let public_key_array: [u8; 32] = public_key_bytes
        .try_into()
        .map_err(|_| anyhow!("Invalid Ed25519 public key length"))?;

    let signature_array: [u8; 64] = signature_bytes
        .try_into()
        .map_err(|_| anyhow!("Invalid Ed25519 signature length"))?;

    let verifying_key = VerifyingKey::from_bytes(&public_key_array)?;
    let signature = Signature::from_bytes(&signature_array);

    verifying_key
        .verify(&checksum_bytes, &signature)
        .map_err(|err| anyhow!("Signature verification failed: {}", err))?;

    Ok(())
}
