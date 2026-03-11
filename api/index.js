const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const raw       = await redis.get('donations') || '[]';
    const donations = typeof raw === 'string' ? JSON.parse(raw) : raw;

    res.json({
      status:           '🟢 online',
      platform:         'Vercel + Upstash Redis',
      totalDonations:   donations.length,
      discord:          process.env.DISCORD_WEBHOOK_URL ? 'configured' : 'disabled',
      allowedUniverses: (process.env.ALLOWED_UNIVERSES || '').split(',').filter(Boolean),
    });
  } catch (err) {
    res.json({ status: '🟢 online', platform: 'Vercel + Upstash Redis', error: err.message });
  }
};
