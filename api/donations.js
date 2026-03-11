if (!global._sessions) global._sessions = {};
if (!global._store)    global._store    = { donations: [], counter: Date.now() };

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-session');
  if (req.method === 'OPTIONS') return res.sendStatus(200);

  const token = req.headers['x-session'];
  if (!token || !global._sessions[token]) {
    return res.json({ ok: false, reason: 'Invalid or expired session', items: [] });
  }

  const afterNum = Number(req.query.after || '0');
  const items    = global._store.donations.filter(d => Number(d.id) > afterNum);
  res.json({ ok: true, items });
};
