import { ensureAuthenticated, db } from './firebaseServer';

async function runTest() {
  try {
    console.log('Starting backend authentication...');
    await ensureAuthenticated();

    const testUserId = 'test_backend_user_id';
    console.log('Using Test UID:', testUserId);
    
    console.log(`[Firestore] Writing test document to users/${testUserId}...`);
    const userRef = db.collection('users').doc(testUserId);
    console.log("[Firestore] operation=set path=users/" + testUserId + " START");
    try {
      await userRef.set({
        name: 'Test Backend',
        updatedAt: new Date().toISOString(),
        isBackendUpdate: true
      }, { merge: true });
      console.log("[Firestore] operation=set path=users/" + testUserId + " SUCCESS");
    } catch (e) {
      console.error("[Firestore] operation=set path=users/" + testUserId + " FAILED", {
        collection: "users",
        document: testUserId,
        line: 15,
        file: "/src/testFirebaseServer.ts",
        error: e
      });
      throw e;
    }
    
    console.log(`Reading document back from users/${testUserId}...`);
    console.log("[Firestore] operation=get path=users/" + testUserId + " START");
    let snap;
    try {
      snap = await userRef.get();
      console.log("[Firestore] operation=get path=users/" + testUserId + " SUCCESS");
    } catch (e) {
      console.error("[Firestore] operation=get path=users/" + testUserId + " FAILED", {
        collection: "users",
        document: testUserId,
        line: 22,
        file: "/src/testFirebaseServer.ts",
        error: e
      });
      throw e;
    }
    console.log('READ SUCCESS! Document Data:', snap.data());
    
    console.log('Adding a webhook log to /webhookLogs...');
    const logsRef = db.collection('webhookLogs');
    console.log("[Firestore] operation=add path=webhookLogs START");
    try {
      const logDoc = await logsRef.add({
        event: 'test_event',
        createdAt: new Date().toISOString()
      });
      console.log("[Firestore] operation=add path=webhookLogs SUCCESS");
      console.log('WEBHOOK LOG ADD SUCCESS! Doc ID:', logDoc.id);
    } catch (e) {
      console.error("[Firestore] operation=add path=webhookLogs FAILED", {
        collection: "webhookLogs",
        document: "N/A",
        line: 27,
        file: "/src/testFirebaseServer.ts",
        error: e
      });
      throw e;
    }
  } catch (err) {
    console.error('TEST FAILED:', err);
  }
}

runTest();
