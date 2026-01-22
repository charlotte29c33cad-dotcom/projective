const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const admin = require('firebase-admin');

const app = express();
const cors = require('cors');
app.use(cors());
app.use(bodyParser.json());

// Initialize Firebase Admin SDK
// Supports multiple methods:
// 1. GOOGLE_APPLICATION_CREDENTIALS env var pointing to JSON file
// 2. Individual env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
try {
  if (!admin.apps.length) {
    let credential;
    
    // Try inline credentials first (easier for Render)
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      console.log('Using inline Firebase credentials from env vars');
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('Using Firebase credentials from file:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
      credential = admin.credential.applicationDefault();
    } else {
      console.error('⚠️ No Firebase credentials found! Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
      // Continue anyway for health check endpoint
      credential = null;
    }

    if (credential) {
      admin.initializeApp({
        credential: credential,
        databaseURL: process.env.FIREBASE_DATABASE_URL || undefined,
      });
      console.log('✅ Firebase Admin initialized successfully');
    }
  }
} catch (err) {
  console.error('❌ Failed to initialize Firebase Admin:', err.message);
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'VK Game Auth Server',
    endpoints: {
      health: '/health',
      auth: 'POST /auth_vk'
    }
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// POST /auth_vk
// Body: { vkUserId: string|number, vkAccessToken: string }
// Returns: { customToken }
app.post('/auth_vk', async (req, res) => {
  const { vkUserId, vkAccessToken } = req.body || {};
  if (!vkUserId) return res.status(400).json({ error: 'vkUserId required' });

  try {
    // If vkAccessToken provided, try to verify it with VK API. If not provided,
    // we fall back to issuing a custom token for development/testing only.
    if (vkAccessToken) {
      const vkApi = `https://api.vk.com/method/users.get?access_token=${encodeURIComponent(vkAccessToken)}&v=5.131`;
      const vkResp = await fetch(vkApi);
      const vkJson = await vkResp.json();

      if (vkJson.error) {
        return res.status(401).json({ error: 'vk_error', details: vkJson.error });
      }

      const returnedId = vkJson.response && vkJson.response[0] && String(vkJson.response[0].id);
      if (String(vkUserId) !== returnedId) {
        return res.status(401).json({ error: 'vk_id_mismatch' });
      }
    } else {
      console.warn('auth_vk: no vkAccessToken provided — issuing token without VK verification (dev only)');
    }

    // Mint Firebase custom token (uid = vkUserId)
    const uid = String(vkUserId);
    const customToken = await admin.auth().createCustomToken(uid);
    return res.json({ customToken });
  } catch (err) {
    console.error('auth_vk error:', err);
    return res.status(500).json({ error: 'server_error', details: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Auth server listening on ${PORT}`));
