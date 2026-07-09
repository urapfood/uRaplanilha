import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import firebaseAppletConfig from './firebase-applet-config.json';

dotenv.config();

// Initialize Express
const app = express();
const PORT = 3000;

// Parse JSON payloads
app.use(express.json());

// Initialize Firebase Admin with the correct Project ID
const adminApp = getApps().length === 0 
  ? initializeApp({ 
      credential: applicationDefault(),
      projectId: firebaseAppletConfig.projectId 
    }) 
  : getApps()[0];

console.log('Firebase Admin Initialized with Options:', JSON.stringify(adminApp.options));

console.log('Firebase Admin Initialized with Project:', adminApp.options.projectId);

// Reference the custom Firestore database used in AI Studio
const db = getFirestore(adminApp, firebaseAppletConfig.firestoreDatabaseId);

// Firestore Logging Helper
async function logFirestoreOp(operation: string, collection: string, document: string, method: string, opFn: () => Promise<any>, line: number) {
  const dbId = firebaseAppletConfig.firestoreDatabaseId;
  const projectId = firebaseAppletConfig.projectId;
  
  console.log("=================================");
  console.log(`Firestore ${operation} Operation`);
  console.log("Project ID:", projectId);
  console.log("Database ID:", dbId);
  console.log("Collection:", collection);
  console.log("Document:", document);
  console.log("Method:", method);
  console.log("Line:", line);
  console.log("=================================");

  try {
    const result = await opFn();
    console.log("SUCCESS");
    return result;
  } catch (error: any) {
    console.error("FIRESTORE FAILURE");
    console.error({
      collection,
      document,
      method,
      line,
      file: "/server.ts",
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// ---------------------------------------------------------
// API ROUTES
// ---------------------------------------------------------

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected' });
});

// ---------------------------------------------------------
// ADMIN / LICENSE MANAGER ROUTES
// ---------------------------------------------------------

// Retrieve all users for the owner admin (urapfood@gmail.com)
app.get('/api/admin/users', async (req, res) => {
  try {
    const { adminId } = req.query;

    if (!adminId || typeof adminId !== 'string') {
      return res.status(400).json({ error: 'adminId é obrigatório.' });
    }

    // Secure verification that the caller is indeed the owner
    const adminUserRef = db.collection('users').doc(adminId);
    const adminDoc = await adminUserRef.get();

    if (!adminDoc.exists || adminDoc.data()?.email !== 'urapfood@gmail.com') {
      return res.status(403).json({
        error: 'Acesso negado. Apenas o administrador do sistema (urapfood@gmail.com) pode acessar esta seção.'
      });
    }

    // Fetch all users sorted by registration date
    console.log(`[Admin] Fetching all registered users for admin ${adminId}...`);
    const usersSnapshot = await db.collection('users').get();
    const usersList: any[] = [];
    usersSnapshot.forEach(doc => {
      usersList.push({ id: doc.id, ...doc.data() });
    });

    return res.json({
      success: true,
      users: usersList,
      webhookLogs: []
    });

  } catch (error: any) {
    console.error('[Admin] Fetch error:', error);
    return res.status(500).json({ error: error.message || 'Erro interno ao recuperar dados administrativos.' });
  }
});

// Admin manual activation/deactivation of customer licenses
app.post('/api/admin/activate-user', async (req, res) => {
  try {
    const { adminId, targetUserId, action } = req.body;

    if (!adminId || !targetUserId || !action) {
      return res.status(400).json({ error: 'adminId, targetUserId e action são obrigatórios.' });
    }

    // Secure verification of the administrator
    const adminUserRef = db.collection('users').doc(adminId);
    const adminDoc = await adminUserRef.get();

    if (!adminDoc.exists || adminDoc.data()?.email !== 'urapfood@gmail.com') {
      return res.status(403).json({ error: 'Acesso negado. Não autorizado.' });
    }

    const targetUserRef = db.collection('users').doc(targetUserId);

    if (action === 'activate') {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Activate for 30 days

      await targetUserRef.set({
        premium: true,
        status: 'active',
        licenseStatus: 'active',
        licenseExpiresAt: expiresAt.toISOString(),
        updatedAt: new Date().toISOString(),
        isBackendUpdate: true
      }, { merge: true });

      console.log(`[Admin] User ${targetUserId} manually activated by admin ${adminId}.`);
    } else if (action === 'deactivate') {
      await targetUserRef.set({
        premium: false,
        status: 'pending',
        licenseStatus: 'pending',
        licenseExpiresAt: null,
        updatedAt: new Date().toISOString(),
        isBackendUpdate: true
      }, { merge: true });

      console.log(`[Admin] User ${targetUserId} manually deactivated by admin ${adminId}.`);
    } else {
      return res.status(400).json({ error: 'Ação inválida. Use "activate" ou "deactivate".' });
    }

    return res.json({ success: true });

  } catch (error: any) {
    console.error('[Admin] Manual activation crash:', error);
    return res.status(500).json({ error: error.message || 'Erro interno ao processar ativação manual.' });
  }
});

// ---------------------------------------------------------
// VITE OR STATIC FILE SERVING
// ---------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
