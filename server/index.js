const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const admin = require('firebase-admin');

const app = express();
const cors = require('cors');
app.use(cors());
app.use(bodyParser.json());

// Initialize Firebase Admin SDK using Application Default Credentials.
// Set GOOGLE_APPLICATION_CREDENTIALS to the path of your service account JSON file.
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      // Optional: set databaseURL via env var if needed
      databaseURL: process.env.FIREBASE_DATABASE_URL || undefined,
    });
    console.log('✅ Firebase Admin initialized');
  }
} catch (err) {
  console.error('Failed to initialize Firebase Admin:', err);
}

app.get('/health', (req, res) => res.json({ ok: true }));

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
