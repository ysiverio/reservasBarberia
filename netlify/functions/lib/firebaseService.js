const admin = require('firebase-admin');

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!raw) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable');
  }

  const attempts = [raw];

  if (!raw.trim().startsWith('{')) {
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf8');
      attempts.push(decoded);
    } catch (decodeError) {
      // Ignore decode errors and fall back to the original value
    }
  }

  let lastError = null;

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT value: ${lastError ? lastError.message : 'unknown parse error'}`);
}

let serviceAccount;

try {
  serviceAccount = parseServiceAccount();
} catch (error) {
  console.error('[firebaseService] Failed to parse Firebase credentials:', error);
  throw error;
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };
