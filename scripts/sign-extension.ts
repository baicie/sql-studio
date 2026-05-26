import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const extensionDir = process.argv[2];
  const keyPath = process.argv[3];

  if (!extensionDir || !keyPath) {
    console.error('Usage: tsx scripts/sign-extension.ts <extension-dir> <private-key-json>');
    process.exit(1);
  }

  const absoluteDir = path.resolve(extensionDir);
  const privateKeyFile = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));

  const checksumsPath = path.join(absoluteDir, 'checksums.json');

  if (!fs.existsSync(checksumsPath)) {
    console.error('Missing checksums.json. Run pack script first or generate checksums manually.');
    process.exit(1);
  }

  const checksumsBytes = fs.readFileSync(checksumsPath);

  const privateKeyDer = Buffer.from(privateKeyFile.privateKeyDerBase64, 'base64');
  const privateKey = crypto.createPrivateKey({
    key: privateKeyDer,
    format: 'der',
    type: 'pkcs8',
  });

  const sign = crypto.createSign('Ed25519');
  sign.update(checksumsBytes);
  sign.end();
  const signature = sign.sign(privateKey);

  const signatureFile = {
    algorithm: 'ed25519',
    publisher: privateKeyFile.publisher,
    keyId: privateKeyFile.keyId,
    signature: signature.toString('base64'),
    signedAt: Date.now(),
  };

  fs.writeFileSync(path.join(absoluteDir, 'signature.sig'), JSON.stringify(signatureFile, null, 2));

  console.log('Signed extension.');
  console.log(`  Publisher: ${signatureFile.publisher}`);
  console.log(`  KeyId: ${signatureFile.keyId}`);
  console.log(`  Signed at: ${new Date(signatureFile.signedAt).toISOString()}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
