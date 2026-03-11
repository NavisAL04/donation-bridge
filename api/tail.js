module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-session');

  if (req.method === 'OPTIONS') return res.sendStatus(200);

  const { getSessions, getLatest } = require('../lib/store');
  const sessions = getSessions();
  const token    = req.headers['x-session'];

  if (!token || !sessions[token]) {
    return res.json({ ok: false, reason: 'Invalid or expired session' });
  }

  const latest = getLatest();
  res.json({ ok: true, id: latest ? latest.id : String(Date.now()) });
};
