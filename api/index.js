const express = require('express');
const { google } = require('googleapis');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// ============================================================
// CONFIG — semua dari Environment Variables Vercel
// ============================================================
const CONFIG = {
  ALLOWED_UNIVERSES: (process.env.ALLOWED_UNIVERSES || '').split(',').filter(Boolean),
  SPREADSHEET_ID:    process.env.SPREADSHEET_ID,
  DISCORD_WEBHOOK:   process.env.DISCORD_WEBHOOK_URL,
};

// ============================================================
// IN-MEMORY STORAGE
// ============================================================
const donations = [];
const sessions  = {};
let   counter   = Date.now();

function addDonation(data) {
  counter++;
  const d = {
    id:        String(counter),
    source:    data.source    || 'unknown',
    donorName: data.donorName || 'Anonim',
    amount:    Number(data.amount) || 0,
    currency:  data.currency  || 'IDR',
    message:   data.message   || '',
    createdAt: Date.now(),
  };
  donations.push(d);
  if (donations.length > 500) donations.splice(0, donations.length - 500);
  return d;
}

function getDonationsAfter(afterId) {
  const afterNum = Number(afterId) || 0;
  return donations.filter(d => Number(d.id) > afterNum);
}

// ============================================================
// GOOGLE SHEETS
// ============================================================
let sheets = null;
if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.SPREADSHEET_ID) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
      ]
    });
    sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Sheets terhubung');
  } catch (err) {
    console.error('❌ Sheets error:', err.message);
  }
}

async function saveToSheets(donor, amount, source, message) {
  if (!sheets) return;
  try {
    // Simpan ke sheet Riwayat
    await sheets.spreadsheets.values.append({
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      range: 'Riwayat!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
          donor,
          amount,
          source,
          message || '-'
        ]]
      }
    });

    // Ambil data leaderboard
    const res  = await sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      range: 'Leaderboard!A:B'
    });
    const rows  = res.data.values || [['Donor', 'Total']];
    let   found = false;

    const updated = rows.map((row, i) => {
      if (i === 0) return row;
      if (row[0] === donor) {
        found = true;
        return [donor, (parseInt(row[1]) || 0) + parseInt(amount)];
      }
      return row;
    });
    if (!found) updated.push([donor, parseInt(amount)]);

    const header = updated[0];
    const sorted = updated.slice(1).sort((a, b) => (b[1] || 0) - (a[1] || 0));

    // Tulis ulang leaderboard
    await sheets.spreadsheets.values.update({
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      range: 'Leaderboard!A:B',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [header, ...sorted] }
    });

    console.log('✅ Sheets: tersimpan');
  } catch (err) {
    console.error('❌ Sheets error:', err.message);
  }
}

// ============================================================
// DISCORD WEBHOOK
// Tidak pakai discord.js — cukup fetch ke Webhook URL
// ============================================================
async function sendToDiscord(donor, amount, source, message) {
  if (!CONFIG.DISCORD_WEBHOOK) return;
  try {
    await fetch(CONFIG.DISCORD_WEBHOOK, {
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
            { name: '💬 Pesan',    value: message || '(tidak ada pesan)' }
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Donation Bridge · Vercel' }
        }]
      })
    });
    console.log('💬 Discord webhook: terkirim');
  } catch (err) {
    console.error('❌ Discord error:', err.message);
  }
}

// ============================================================
// ROUTES — dipakai Roblox script
// ============================================================

// Health check
app.get('/', (req, res) => {
  res.json({
    status:         '🟢 online',
    platform:       'Vercel Serverless',
    totalDonations: donations.length,
    sheets:         sheets    ? 'connected' : 'disabled',
    discord:        CONFIG.DISCORD_WEBHOOK ? 'ready' : 'disabled',
  });
});

// POST /api/session — Roblox minta session token saat server start
app.post('/api/session', (req, res) => {
  const { universeId } = req.body || {};

  if (!universeId) {
    return res.json({ ok: false, reason: 'Missing universeId' });
  }

  // Cek license
  if (CONFIG.ALLOWED_UNIVERSES.length > 0 && !CONFIG.ALLOWED_UNIVERSES.includes(String(universeId))) {
    console.warn(`❌ Universe tidak terdaftar: ${universeId}`);
    return res.json({ ok: false, reason: 'Universe ID not registered. Please contact the developer.' });
  }

  // Buat session token
  const token = crypto.randomBytes(32).toString('hex');
  sessions[token] = { universeId: String(universeId), createdAt: Date.now() };

  // Cleanup session lama lebih dari 24 jam
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [t, s] of Object.entries(sessions)) {
    if (s.createdAt < cutoff) delete sessions[t];
  }

  console.log(`✅ Session dibuat untuk Universe: ${universeId}`);
  res.json({ ok: true, token });
});

// GET /api/tail — ambil ID donasi terakhir
app.get('/api/tail', (req, res) => {
  const token = req.headers['x-session'];
  if (!token || !sessions[token]) {
    return res.json({ ok: false, reason: 'Invalid or expired session' });
  }
  const latest = donations[donations.length - 1];
  res.json({
    ok: true,
    id: latest ? latest.id : String(Date.now())
  });
});

// GET /api/donations?after=ID — Roblox polling donasi baru
app.get('/api/donations', (req, res) => {
  const token = req.headers['x-session'];
  if (!token || !sessions[token]) {
    return res.json({ ok: false, reason: 'Invalid or expired session', items: [] });
  }
  const items = getDonationsAfter(req.query.after || '0');
  res.json({ ok: true, items });
});

// ============================================================
// WEBHOOK ENDPOINTS — dari platform donasi
// ============================================================

// Sociabuzz
app.post('/webhook/sociabuzz', async (req, res) => {
  console.log('📨 Sociabuzz:', JSON.stringify(req.body));

  const donor   = req.body.invoker_name || req.body.donor   || 'Anonim';
  const amount  = req.body.amount       || 0;
  const message = req.body.message      || req.body.note    || '';

  const d = addDonation({
    source: 'sociabuzz', donorName: donor,
    amount, currency: 'IDR', message
  });

  console.log(`💛 Sociabuzz: ${donor} - Rp${amount} [ID: ${d.id}]`);

  await Promise.all([
    saveToSheets(donor, amount, 'sociabuzz', message),
    sendToDiscord(donor, amount, 'Sociabuzz', message)
  ]);

  res.sendStatus(200);
});

// Saweria
app.post('/webhook/saweria', async (req, res) => {
  console.log('📨 Saweria:', JSON.stringify(req.body));

  const donor   = req.body.donatur_name || req.body.donor   || 'Anonim';
  const amount  = req.body.amount_raw   || req.body.amount  || 0;
  const message = req.body.donatur_say  || req.body.message || '';

  const d = addDonation({
    source: 'saweria', donorName: donor,
    amount, currency: 'IDR', message
  });

  console.log(`💛 Saweria: ${donor} - Rp${amount} [ID: ${d.id}]`);

  await Promise.all([
    saveToSheets(donor, amount, 'saweria', message),
    sendToDiscord(donor, amount, 'Saweria', message)
  ]);

  res.sendStatus(200);
});

// Tako
app.post('/webhook/tako', async (req, res) => {
  console.log('📨 Tako:', JSON.stringify(req.body));

  const donor   = req.body.supporter_name || req.body.donor   || 'Anonim';
  const amount  = req.body.amount         || 0;
  const message = req.body.message        || '';

  const d = addDonation({
    source: 'tako', donorName: donor,
    amount, currency: 'IDR', message
  });

  console.log(`💛 Tako: ${donor} - Rp${amount} [ID: ${d.id}]`);

  await Promise.all([
    saveToSheets(donor, amount, 'tako', message),
    sendToDiscord(donor, amount, 'Tako', message)
  ]);

  res.sendStatus(200);
});

// ============================================================
// EXPORT — wajib untuk Vercel serverless
// ============================================================
module.exports = app;
