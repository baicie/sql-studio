use crate::security::checksum::{read_checksums, verify_checksums};
use crate::security::signature::{read_signature, verify_signature};
use crate::security::trust::TrustStore;
use crate::security::types::{PluginVerificationResult, SignatureStatus};
use std::path::Path;

pub fn verify_extension_package_dir(
    extension_dir: &Path,
    trust_store: &TrustStore,
    allow_unsigned: bool,
) -> PluginVerificationResult {
    let checksums = match read_checksums(extension_dir) {
        Ok(value) => value,
        Err(err) => {
            if allow_unsigned {
                return PluginVerificationResult {
                    status: SignatureStatus::Unsigned,
                    publisher: None,
                    key_id: None,
                    message: Some(err.to_string()),
                    checksums_valid: false,
                    signature_valid: false,
                    publisher_trusted: false,
                };
            }

            return PluginVerificationResult {
                status: SignatureStatus::Invalid,
                publisher: None,
                key_id: None,
                message: Some(err.to_string()),
                checksums_valid: false,
                signature_valid: false,
                publisher_trusted: false,
            };
        }
    };

    if let Err(err) = verify_checksums(extension_dir, &checksums) {
        return PluginVerificationResult {
            status: SignatureStatus::Invalid,
            publisher: None,
            key_id: None,
            message: Some(err.to_string()),
            checksums_valid: false,
            signature_valid: false,
            publisher_trusted: false,
        };
    }

    let signature = match read_signature(extension_dir) {
        Ok(value) => value,
        Err(err) => {
            if allow_unsigned {
                return PluginVerificationResult {
                    status: SignatureStatus::Unsigned,
                    publisher: None,
                    key_id: None,
                    message: Some(err.to_string()),
                    checksums_valid: true,
                    signature_valid: false,
                    publisher_trusted: false,
                };
            }

            return PluginVerificationResult {
                status: SignatureStatus::Invalid,
                publisher: None,
                key_id: None,
                message: Some(err.to_string()),
                checksums_valid: true,
                signature_valid: false,
                publisher_trusted: false,
            };
        }
    };

    let key = match trust_store.get_key(&signature.publisher, &signature.key_id) {
        Ok(Some(key)) => key,
        Ok(None) => {
            return PluginVerificationResult {
                status: SignatureStatus::Untrusted,
                publisher: Some(signature.publisher),
                key_id: Some(signature.key_id),
                message: Some("Publisher is not trusted".to_string()),
                checksums_valid: true,
                signature_valid: false,
                publisher_trusted: false,
            };
        }
        Err(err) => {
            return PluginVerificationResult {
                status: SignatureStatus::Unknown,
                publisher: Some(signature.publisher),
                key_id: Some(signature.key_id),
                message: Some(err.to_string()),
                checksums_valid: true,
                signature_valid: false,
                publisher_trusted: false,
            };
        }
    };

    match verify_signature(extension_dir, &signature, &key) {
        Ok(()) => PluginVerificationResult {
            status: SignatureStatus::Verified,
            publisher: Some(signature.publisher),
            key_id: Some(signature.key_id),
            message: None,
            checksums_valid: true,
            signature_valid: true,
            publisher_trusted: true,
        },
        Err(err) => PluginVerificationResult {
            status: SignatureStatus::Invalid,
            publisher: Some(signature.publisher),
            key_id: Some(signature.key_id),
            message: Some(err.to_string()),
            checksums_valid: true,
            signature_valid: false,
            publisher_trusted: true,
        },
    }
}
