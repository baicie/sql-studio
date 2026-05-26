import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const publisher = process.argv[2];

if (!publisher) {
  console.error('Usage: tsx scripts/generate-extension-key.ts <publisher>');
  process.exit(1);
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

const outDir = path.resolve('.sqlgui-keys', publisher);
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, 'private.pem'),
  privateKey.export({
    type: 'pkcs8',
    format: 'pem',
  }),
);

fs.writeFileSync(
  path.join(outDir, 'public.pem'),
  publicKey.export({
    type: 'spki',
    format: 'pem',
  }),
);

const publicDer = publicKey.export({
  type: 'spki',
  format: 'der',
});

const privateDer = privateKey.export({
  type: 'pkcs8',
  format: 'der',
});

fs.writeFileSync(
  path.join(outDir, 'publisher-key.json'),
  JSON.stringify(
    {
      publisher,
      keyId: `${publisher}.default`,
      algorithm: 'ed25519',
      publicKeyDerBase64: publicDer.toString('base64'),
      createdAt: Date.now(),
    },
    null,
    2,
  ),
);

fs.writeFileSync(
  path.join(outDir, 'private-key.json'),
  JSON.stringify(
    {
      publisher,
      keyId: `${publisher}.default`,
      algorithm: 'ed25519',
      privateKeyDerBase64: privateDer.toString('base64'),
      createdAt: Date.now(),
    },
    null,
    2,
  ),
);

console.log(`Generated key pair: ${outDir}`);
console.log(`  - private-key.json (for signing)`);
console.log(`  - publisher-key.json (for distribution)`);
