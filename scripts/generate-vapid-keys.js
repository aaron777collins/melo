/**
 * Script to generate VAPID keys for Web Push notifications
 * Run with: node scripts/generate-vapid-keys.js
 */

const crypto = require('crypto');

function generateVapidKeys() {
  // Generate ECDSA P-256 key pair
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'der'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der'
    }
  });

  // Convert to base64url format
  const privateKeyBase64 = privateKey.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const publicKeyBase64 = publicKey.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64
  };
}

function main() {
  console.log('Generating VAPID keys for Web Push...\n');
  
  const keys = generateVapidKeys();
  
  console.log('VAPID Keys Generated:');
  console.log('====================');
  console.log('');
  console.log('Add these to your .env file:');
  console.log('');
  console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
  console.log(`VAPID_SUBJECT=mailto:contact@aaroncollins.info`);
  console.log('');
  console.log('Public key (for client-side):', keys.publicKey);
  console.log('');
  console.log('Private key (keep secret!):', keys.privateKey);
  console.log('');
  console.log('⚠️  IMPORTANT: Keep the private key secret and never expose it to client-side code!');
}

if (require.main === module) {
  main();
}

module.exports = { generateVapidKeys };