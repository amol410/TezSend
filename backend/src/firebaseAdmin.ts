import {
  initializeApp,
  getApps,
  getApp,
  cert,
  type App,
} from 'firebase-admin/app';
import path from 'path';
import fs from 'fs';

// Look for the service account key in the backend root.
// __dirname = /...backend/src, so go one level up.
const serviceAccountPath = path.resolve(__dirname, '..', 'tezsend-firebase-adminsdk.json');

let firebaseApp: App;

function initFirebaseAdmin(): App {
  const existingApps = getApps();
  console.log(`Firebase Admin: initFirebaseAdmin() called. existingApps=${existingApps.length}, path=${serviceAccountPath}`);

  // Guard against double-initialization during tsx hot-reload.
  if (existingApps.length > 0) {
    console.log('Firebase Admin: reusing already-initialized app.');
    return getApp();
  }

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(
      `Firebase Admin: service account NOT found at:\n  ${serviceAccountPath}\n` +
      'Place tezsend-firebase-adminsdk.json in the /backend directory.'
    );
  }

  // Use readFileSync + JSON.parse instead of require() to bypass Node module cache.
  const raw = fs.readFileSync(serviceAccountPath, 'utf8');
  const serviceAccount = JSON.parse(raw);

  const app = initializeApp({
    credential: cert(serviceAccount),
  });

  console.log(`Firebase Admin: initialized (project: ${serviceAccount.project_id})`);
  return app;
}

firebaseApp = initFirebaseAdmin();

export { firebaseApp };
export default firebaseApp;
