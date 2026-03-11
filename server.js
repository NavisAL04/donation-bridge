const express = require('express');
const { google } = require('googleapis');

const app = express();
app.use(express.json());

const CONFIG = {
  ROBLOX_API_KEY:     process.env.ROBLOX_API_KEY,
  UNIVERSE_ID:        process.env.UNIVERSE_ID,
  DISCORD_TOKEN:      process.env.DISCORD_TOKEN,
  DISCORD_CHANNEL_ID: process.env.DISCORD_CHANNEL_ID,
  SPREADSHEET_ID:     process.env.SPREADSHEET_ID,
  PORT:               process.env.PORT || 3000
};

// ============================================================
// GOOGLE SHEETS
// ============================================================
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
  ]
});
const sheets = google.sheets({ version: 'v4', auth });

async function saveToSheets(donor, amount, note) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      range: 'Riwayat!A:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
          donor,
          amount,
          note || '-'
        ]]
      }
    });
    await updateLeaderboardSheet(donor, amount);
    console.log('✅ Google Sheets: tersimpan');
    return true;
  } catch (err) {
    console.error('❌ Sheets error:', err.message);
    return false;
  }
}

async function updateLeaderboardSheet(donor, amount) {
  try {
    const res  = await sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      range: 'Leaderboard!A:B'
    });
    const rows   = res.data.values || [['Donor', 'Total']];
    let   found  = false;

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
    const data   = updated.slice(1).sort((a, b) => (b[1] || 0) - (a[1] || 0));

    await sheets.spreadsheets.values.update({
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      range: 'Leaderboard!A:B',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [header, ...data] }
    });
  } catch (err) {
    console.error('❌ Leaderboard error:', err.message);
  }
}

async function getTopDonors() {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      range: 'Leaderboard!A2:B11'
    });
    return res.data.values || [];
  } catch (err) {
    console.error('❌ Get top donors error:', err.message);
    return [];
  }
}

// ============================================================
// DISCORD BOT
// ============================================================
const discordClient = new Client({ intents: [GatewayIntentBits.Guilds] });
discordClient.once('ready', () => {
  console.log(`✅ Discord Bot online: ${discordClient.user.tag}`);
});
discordClient.login(CONFIG.DISCORD_TOKEN);

async function sendToDiscord(donor, amount, note, topDonors) {
  try {
    const channel = await discordClient.channels.fetch(CONFIG.DISCORD_CHANNEL_ID);

    const leaderboardText = topDonors.length > 0
      ? topDonors.map((row, i) =>
          `**#${i + 1}** ${row[0]} — Rp${Number(row[1]).toLocaleString('id-ID')}`
        ).join('\n')
      : 'Belum ada data';

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('💛 Donasi Masuk!')
      .addFields(
        { name: '👤 Donatur', value: donor,  inline: true },
        { name: '💰 Jumlah',  value: `Rp${Number(amount).toLocaleString('id-ID')}`, inline: true },
        { name: '💬 Pesan',   value: note || '(tidak ada pesan)' },
        { name: '🏆 Top Donatur', value: leaderboardText }
      )
      .setTimestamp()
      .setFooter({ text: 'Sociabuzz Donation System' });

    await channel.send({ embeds: [embed] });
    console.log('💬 Discord: terkirim');
  } catch (err) {
    console.error('❌ Discord error:', err.message);
  }
}

// ============================================================
// ROBLOX
// ============================================================
async function sendToRoblox(donor, amount, note, topDonors) {
  try {
    const res = await fetch(
      `https://apis.roblox.com/messaging-service/v1/universes/${CONFIG.UNIVERSE_ID}/topics/Donation`,
      {
        method: 'POST',
        headers: {
          'x-api-key': CONFIG.ROBLOX_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: JSON.stringify({ donor, amount, note, topDonors })
        })
      }
    );
    console.log(`🎮 Roblox: ${res.status}`);
  } catch (err) {
    console.error('❌ Roblox error:', err.message);
  }
}

// ============================================================
// WEBHOOK ENDPOINT
// ============================================================
app.post('/webhook/sociabuzz', async (req, res) => {
  console.log('📨 Webhook masuk:', JSON.stringify(req.body));

  const donor  = req.body.invoker_name || req.body.donor || 'Anonim';
  const amount = req.body.amount       || 0;
  const note   = req.body.message      || req.body.note  || '';

  await saveToSheets(donor, amount, note);
  const topDonors = await getTopDonors();

  await Promise.all([
    sendToRoblox(donor, amount, note, topDonors),
    sendToDiscord(donor, amount, note, topDonors)
  ]);

  res.sendStatus(200);
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: '🟢 online', bot: discordClient.user?.tag || 'connecting...' });
});

// Keep alive
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
  setInterval(async () => {
    try { await fetch(RENDER_URL); console.log('💓 Keep alive'); }
    catch (err) { console.error('Keep alive error:', err.message); }
  }, 10 * 60 * 1000);
}

app.listen(CONFIG.PORT, () => {
  console.log(`🚀 Server jalan di port ${CONFIG.PORT}`);
});
