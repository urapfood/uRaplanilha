import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseAppletConfig from '../firebase-applet-config.json';

const adminApp = getApps().length === 0 
  ? initializeApp({ 
      credential: applicationDefault(),
      projectId: firebaseAppletConfig.projectId 
    }) 
  : getApps()[0];

export const db = getFirestore(adminApp, firebaseAppletConfig.firestoreDatabaseId);

// auth is not needed for Admin SDK to access Firestore, 
// but keeping the export for compatibility if needed elsewhere.
export const auth = null; 

export async function ensureAuthenticated() {
  console.log('[FirebaseServer] Admin SDK initialized with application default credentials and project ID:', adminApp.options.projectId);
  console.log('[FirebaseServer] Options:', JSON.stringify(adminApp.options));
  console.log('[FirebaseServer] GOOGLE_CLOUD_PROJECT:', process.env.GOOGLE_CLOUD_PROJECT);
}
