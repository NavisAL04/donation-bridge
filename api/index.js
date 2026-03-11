module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.sendStatus(200);

  const donations = global._store ? global._store.donations : [];
  const sessions  = global._sessions ? global._sessions : {};

  res.json({
    status:           '🟢 online',
    platform:         'Vercel Serverless',
    totalDonations:   donations.length,
    totalSessions:    Object.keys(sessions).length,
    sheets:           process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? 'configured' : 'disabled',
    discord:          process.env.DISCORD_WEBHOOK_URL ? 'configured' : 'disabled',
    allowedUniverses: (process.env.ALLOWED_UNIVERSES || '').split(',').filter(Boolean),
  });
};
