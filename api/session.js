const crypto = require('crypto');
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-session');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, reason: 'Method not allowed' });

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const universeId = String(body.universeId || '');
    if (!universeId) return res.json({ ok: false, reason: 'Missing universeId' });

    const allowed = (process.env.ALLOWED_UNIVERSES || '').split(',').filter(Boolean);
    if (allowed.length > 0 && !allowed.includes(universeId)) {
      console.warn(`❌ Universe tidak terdaftar: ${universeId}`);
      return res.json({ ok: false, reason: 'Universe ID not registered.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    // Simpan session ke Redis dengan TTL 24 jam
    await redis.set(`session:${token}`, universeId, { ex: 86400 });

    console.log(`✅ Session OK untuk Universe: ${universeId}`);
    res.json({ ok: true, token });
  } catch (err) {
    console.error('❌ Session error:', err.message);
    res.status(500).json({ ok: false, reason: err.message });
  }
};
