if (!global._store) global._store = { donations: [], counter: Date.now() };

function addDonation(data) {
  global._store.counter++;
  const d = {
    id:        String(global._store.counter),
    source:    data.source    || 'unknown',
    donorName: data.donorName || 'Anonim',
    amount:    Number(data.amount) || 0,
    currency:  data.currency  || 'IDR',
    message:   data.message   || '',
    createdAt: Date.now(),
  };
  global._store.donations.push(d);
  if (global._store.donations.length > 500) {
    global._store.donations.splice(0, global._store.donations.length - 500);
  }
  return d;
}

async function sendToDiscord(donor, amount, source, message) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '💛 Donasi Masuk!',
          color: 0xFFD700,
          fields: [
            { name: '👤 Donatur',  value: String(donor),  inline: true },
            { name: '💰 Jumlah',   value: `Rp${Number(amount).toLocaleString('id-ID')}`, inline: true },
            { name: '🎯 Platform', value: String(source), inline: true },
            { name: '💬 Pesan',    value: message || '(tidak ada pesan)' },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Donation Bridge · Vercel' },
        }],
      }),
    });
    console.log('💬 Discord: terkirim');
  } catch (err) {
    console.error('❌ Discord error:', err.message);
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });
  if (req.method !== 'POST') return res.status(405).end();

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const donor   = body.donatur_name || body.donor   || 'Anonim';
    const amount  = Number(body.amount_raw || body.amount) || 0;
    const message = body.donatur_say  || body.message || '';

    const d = addDonation({
      source: 'saweria', donorName: donor,
      amount, currency: 'IDR', message,
    });

    console.log(`💛 Saweria: ${donor} - Rp${amount} [ID: ${d.id}]`);
    await sendToDiscord(donor, amount, 'Saweria', message);

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
