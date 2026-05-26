pub mod file;
pub mod manifest;
pub mod scanner;
pub mod types;

pub use file::read_extension_entry;
pub use manifest::ExtensionManifest;
pub use scanner::{scan_extensions, ExtensionScanResult};
pub use types::{ExtensionEntryRequest, ExtensionEntrySource};

pub fn extension_core_ready() -> bool {
    true
}
