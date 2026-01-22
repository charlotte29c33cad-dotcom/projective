# VK -> Firebase Auth Server

This small server verifies a VK access token and mints a Firebase Custom Token for that VK user id.

Requirements
- Node 16+ (or Node 14+ with compatibility)
- A Firebase service account JSON or Application Default Credentials configured via `GOOGLE_APPLICATION_CREDENTIALS`

Setup

1. Create a Firebase service account key in Firebase Console → Project Settings → Service accounts → Generate new private key. Save the JSON file locally.
2. On the server machine, set environment variable:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
export FIREBASE_DATABASE_URL="https://<your-db>.firebaseio.com" # optional
```

3. Install deps and start:

```bash
cd server
npm install
npm start
```

Endpoint

POST /auth_vk

Request JSON:

```json
{ "vkUserId": "123456", "vkAccessToken": "VK_ACCESS_TOKEN" }
```

Response JSON:

```json
{ "customToken": "<FIREBASE_CUSTOM_TOKEN>" }
```

Client example (browser):

```javascript
// exchange vk token + user id on your server
const resp = await fetch('https://your-server.example.com/auth_vk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ vkUserId: vkUserId, vkAccessToken: vkAccessToken })
});
const { customToken } = await resp.json();

// sign in with Firebase client SDK (compat or modular)
firebase.auth().signInWithCustomToken(customToken)
  .then(() => console.log('Signed in to Firebase with custom token'))
  .catch(err => console.error(err));
```

Security notes
- Never commit service account JSON to the repository.
- Validate the VK access token server-side as shown (it calls `users.get`).
- Consider rate-limiting and protecting `/auth_vk` with additional checks.
