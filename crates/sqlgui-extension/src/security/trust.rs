use crate::security::types::TrustedPublisher;
use anyhow::Result;
use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;

#[derive(Clone)]
pub struct TrustStore {
    path: PathBuf,
}

impl TrustStore {
    pub fn new(path: PathBuf) -> Self {
        Self { path }
    }

    pub fn load(&self) -> Result<BTreeMap<String, TrustedPublisher>> {
        if !self.path.exists() {
            return Ok(BTreeMap::new());
        }

        let content = fs::read_to_string(&self.path)?;
        let publishers: BTreeMap<String, TrustedPublisher> = serde_json::from_str(&content)?;

        Ok(publishers)
    }

    pub fn save(&self, publishers: &BTreeMap<String, TrustedPublisher>) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }

        let content = serde_json::to_string_pretty(publishers)?;
        fs::write(&self.path, content)?;

        Ok(())
    }

    pub fn get_key(&self, publisher: &str, key_id: &str) -> Result<Option<String>> {
        let publishers = self.load()?;

        let Some(item) = publishers.get(publisher) else {
            return Ok(None);
        };

        if !item.trusted {
            return Ok(None);
        }

        let Some(key) = item.keys.iter().find(|key| key.key_id == key_id) else {
            return Ok(None);
        };

        Ok(Some(key.public_key.clone()))
    }

    pub fn upsert(&self, publisher: TrustedPublisher) -> Result<()> {
        let mut publishers = self.load()?;
        publishers.insert(publisher.publisher.clone(), publisher);
        self.save(&publishers)
    }

    pub fn revoke(&self, publisher: &str) -> Result<()> {
        let mut publishers = self.load()?;

        if let Some(item) = publishers.get_mut(publisher) {
            item.trusted = false;
        }

        self.save(&publishers)
    }
}
