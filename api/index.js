module.exports = (req, res) => {
  const { getSessions, getDonationsAfter } = require('../lib/store');
  const sessions  = getSessions();
  const donations = getDonationsAfter('0');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    status:          '🟢 online',
    platform:        'Vercel Serverless',
    totalDonations:  donations.length,
    totalSessions:   Object.keys(sessions).length,
    sheets:          process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? 'configured' : 'disabled',
    discord:         process.env.DISCORD_WEBHOOK_URL ? 'configured' : 'disabled',
    allowedUniverses: (process.env.ALLOWED_UNIVERSES || '').split(',').filter(Boolean),
  });
};
