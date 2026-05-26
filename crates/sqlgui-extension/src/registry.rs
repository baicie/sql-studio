use crate::installer_types::InstalledExtensionRecord;
use anyhow::Result;
use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;

#[derive(Clone)]
pub struct ExtensionRegistryStore {
    registry_path: PathBuf,
}

impl ExtensionRegistryStore {
    pub fn new(registry_path: PathBuf) -> Self {
        Self { registry_path }
    }

    pub fn load(&self) -> Result<BTreeMap<String, InstalledExtensionRecord>> {
        if !self.registry_path.exists() {
            return Ok(BTreeMap::new());
        }

        let content = fs::read_to_string(&self.registry_path)?;
        let records = serde_json::from_str(&content)?;

        Ok(records)
    }

    pub fn save(
        &self,
        records: &BTreeMap<String, InstalledExtensionRecord>,
    ) -> Result<()> {
        if let Some(parent) = self.registry_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let content = serde_json::to_string_pretty(records)?;
        fs::write(&self.registry_path, content)?;

        Ok(())
    }

    pub fn upsert(&self, record: InstalledExtensionRecord) -> Result<()> {
        let mut records = self.load()?;
        records.insert(record.id.clone(), record);
        self.save(&records)
    }

    pub fn remove(&self, extension_id: &str) -> Result<Option<InstalledExtensionRecord>> {
        let mut records = self.load()?;
        let removed = records.remove(extension_id);
        self.save(&records)?;
        Ok(removed)
    }
}
