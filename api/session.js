const crypto = require('crypto');

if (!global._sessions) global._sessions = {};

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-session');

  if (req.method === 'OPTIONS') return res.sendStatus(200);
  if (req.method !== 'POST') return res.status(405).json({ ok: false, reason: 'Method not allowed' });

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const universeId = body.universeId;
    console.log('📥 /api/session universeId:', universeId);

    if (!universeId) {
      return res.json({ ok: false, reason: 'Missing universeId' });
    }

    const allowed = (process.env.ALLOWED_UNIVERSES || '').split(',').filter(Boolean);
    console.log('✅ Allowed:', allowed);

    if (allowed.length > 0 && !allowed.includes(String(universeId))) {
      console.warn(`❌ Universe tidak terdaftar: ${universeId}`);
      return res.json({ ok: false, reason: 'Universe ID not registered.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    global._sessions[token] = { universeId: String(universeId), createdAt: Date.now() };

    // Cleanup session lama lebih dari 24 jam
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [t, s] of Object.entries(global._sessions)) {
      if (s.createdAt < cutoff) delete global._sessions[t];
    }

    console.log(`✅ Session OK untuk Universe: ${universeId}`);
    res.json({ ok: true, token });
  } catch (err) {
    console.error('❌ Session error:', err.message);
    res.status(500).json({ ok: false, reason: err.message });
  }
};
