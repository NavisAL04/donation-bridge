module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-session');

  if (req.method === 'OPTIONS') return res.sendStatus(200);

  const { getSessions, getDonationsAfter } = require('../lib/store');
  const sessions = getSessions();
  const token    = req.headers['x-session'];

  if (!token || !sessions[token]) {
    return res.json({ ok: false, reason: 'Invalid or expired session', items: [] });
  }

  const items = getDonationsAfter(req.query.after || '0');
  res.json({ ok: true, items });
};
