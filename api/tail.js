if (!global._sessions) global._sessions = {};
if (!global._store)    global._store    = { donations: [], counter: Date.now() };

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-session');
  if (req.method === 'OPTIONS') return res.sendStatus(200);

  const token = req.headers['x-session'];
  if (!token || !global._sessions[token]) {
    return res.json({ ok: false, reason: 'Invalid or expired session' });
  }

  const donations = global._store.donations;
  const latest    = donations[donations.length - 1];
  res.json({ ok: true, id: latest ? latest.id : String(Date.now()) });
};
