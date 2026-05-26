pub mod file;
pub mod fs_utils;
pub mod installer;
pub mod installer_types;
pub mod manifest;
pub mod registry;
pub mod scanner;
pub mod security;
pub mod types;

pub use file::read_extension_entry;
pub use installer::ExtensionInstaller;
pub use installer_types::{
    ExtensionInstallResult, ExtensionInstallType, FolderInstallMode, InstallFromFolderRequest,
    InstallFromPackageRequest, InstalledExtensionRecord, UninstallExtensionRequest,
};
pub use manifest::ExtensionManifest;
pub use registry::ExtensionRegistryStore;
pub use scanner::{scan_extensions, ExtensionScanResult};
pub use security::{
    package_verify::verify_extension_package_dir,
    trust::TrustStore,
    types::{PluginVerificationResult, SignatureStatus, SignatureFile, ChecksumFile},
};
pub use types::{ExtensionEntryRequest, ExtensionEntrySource};

pub fn extension_core_ready() -> bool {
    true
}
