const {
  initializeApp,
  getApps,
  getApp,
  cert,
} = require('firebase-admin/app');
const path = require('path');
const fs = require('fs');

// __dirname = /...backend/src, so go one level up to /backend
const serviceAccountPath = path.resolve(__dirname, '..', 'tezsend-firebase-adminsdk.json');

let firebaseApp;

function initFirebaseAdmin() {
  const existingApps = getApps();

  // Guard against double-initialization
  if (existingApps.length > 0) {
    console.log('Firebase Admin: reusing already-initialized app.');
    return getApp();
  }

  let serviceAccount;

  // 1) Prefer env var (production / CI / hosting without file access)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    console.log('Firebase Admin: loading credentials from FIREBASE_SERVICE_ACCOUNT_JSON env var.');
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch {
      throw new Error(
        'Firebase Admin: FIREBASE_SERVICE_ACCOUNT_JSON is set but contains invalid JSON. ' +
        'Make sure the value is the raw contents of the service account JSON file.'
      );
    }
  }
  // 2) Fall back to local file (local development)
  else if (fs.existsSync(serviceAccountPath)) {
    console.log(`Firebase Admin: loading credentials from file: ${serviceAccountPath}`);
    const raw = fs.readFileSync(serviceAccountPath, 'utf8');
    serviceAccount = JSON.parse(raw);
  }
  // 3) Neither source found — give a clear error
  else {
    throw new Error(
      'Firebase Admin: no credentials found.\n' +
      '  • Production: set the FIREBASE_SERVICE_ACCOUNT_JSON environment variable to the\n' +
      '    full JSON contents of your service account key.\n' +
      `  • Local dev: place tezsend-firebase-adminsdk.json in the /backend directory.\n` +
      `  (Looked for file at: ${serviceAccountPath})`
    );
  }

  const app = initializeApp({ credential: cert(serviceAccount) });

  const projectId = serviceAccount.project_id ?? 'unknown';
  console.log(`Firebase Admin: initialized (project: ${projectId})`);
  return app;
}

firebaseApp = initFirebaseAdmin();

module.exports = { firebaseApp };
