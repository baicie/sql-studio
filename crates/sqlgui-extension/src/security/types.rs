use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChecksumFile {
    pub algorithm: String,
    pub files: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignatureFile {
    pub algorithm: String,
    pub publisher: String,
    pub key_id: String,
    pub signature: String,
    pub signed_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublisherKey {
    pub key_id: String,
    pub algorithm: String,
    pub public_key: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrustedPublisher {
    pub publisher: String,
    pub display_name: Option<String>,
    pub trusted: bool,
    pub keys: Vec<PublisherKey>,
    pub trusted_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SignatureStatus {
    Verified,
    Unsigned,
    Invalid,
    Untrusted,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginVerificationResult {
    pub status: SignatureStatus,
    pub publisher: Option<String>,
    pub key_id: Option<String>,
    pub message: Option<String>,
    pub checksums_valid: bool,
    pub signature_valid: bool,
    pub publisher_trusted: bool,
}
