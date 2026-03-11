const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-session');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const token      = req.headers['x-session'];
    const universeId = token ? await redis.get(`session:${token}`) : null;

    if (!universeId) {
      return res.json({ ok: false, reason: 'Invalid or expired session', items: [] });
    }

    const afterNum = Number(req.query.after || '0');

    // Ambil semua donasi dari Redis list
    const raw  = await redis.get('donations') || '[]';
    const all  = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const items = all.filter(d => Number(d.id) > afterNum);

    res.json({ ok: true, items });
  } catch (err) {
    console.error('❌ Donations error:', err.message);
    res.status(500).json({ ok: false, reason: err.message, items: [] });
  }
};
