import { onRequest } from 'firebase-functions/v2/https';

export const corsTest = onRequest({}, async (req, res) => {
  console.log('🧪 CORS Test function called - Method:', req.method, 'Origin:', req.headers.origin);

  // Set CORS headers
  res.set('Access-Control-Allow-Origin', 'https://dopair.app');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  console.log('🧪 CORS headers set');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    console.log('🧪 Handling OPTIONS preflight request');
    res.status(200).end();
    return;
  }

  console.log('🧪 Handling main request');
  res.json({ message: 'CORS test successful', origin: req.headers.origin });
});