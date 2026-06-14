# 💛 Donation Bridge for Roblox

A lightweight **serverless API** that streams real-time donations from popular Indonesian donation platforms straight into your **Roblox** game. Built with Node.js + Express and designed to run on **Vercel**.

When a viewer donates on **Saweria**, **Sociabuzz**, or **Tako**, the donation instantly appears in-game (for on-screen alerts, effects, leaderboards, etc.), gets posted to **Discord**, and is logged to **Google Sheets** with a running leaderboard.

---

## ✨ Features

- 🎮 **Roblox-ready API** &mdash; secure session tokens + polling endpoints so your game can fetch new donations safely
- 🔌 **Multi-platform webhooks** &mdash; supports **Saweria**, **Sociabuzz**, and **Tako** out of the box
- 💬 **Discord notifications** &mdash; sends a rich embed to your server for every donation
- 📊 **Google Sheets logging** &mdash; auto-saves donation history and maintains a sorted leaderboard
- 🔐 **Universe allowlist** &mdash; restrict access to only your registered Roblox universe IDs
- ☁️ **Serverless** &mdash; deploys easily to Vercel, no server to maintain

---

## 🔄 How it works

```
Donation Platform (Saweria / Sociabuzz / Tako)
            │  webhook
            ▼
     Donation Bridge (Express on Vercel)
        │         │            │
        ▼         ▼            ▼
   Roblox Game   Discord    Google Sheets
   (polling)     (embed)    (history + leaderboard)
```

1. A viewer donates on a supported platform.
2. The platform calls this bridge via a **webhook** (`/webhook/saweria`, `/webhook/sociabuzz`, `/webhook/tako`).
3. The donation is stored, forwarded to **Discord**, and appended to **Google Sheets**.
4. Your Roblox game opens a **session** and polls `/api/donations` to display new donations live.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET`  | `/` | Health check & status (sheets/discord/total donations) |
| `POST` | `/api/session` | Create a session token for a Roblox `universeId` |
| `GET`  | `/api/tail` | Get the latest donation ID (requires `x-session` header) |
| `GET`  | `/api/donations?after=<id>` | Get donations after a given ID (requires `x-session` header) |
| `POST` | `/webhook/saweria` | Webhook receiver for Saweria |
| `POST` | `/webhook/sociabuzz` | Webhook receiver for Sociabuzz |
| `POST` | `/webhook/tako` | Webhook receiver for Tako |

---

## ⚙️ Environment Variables

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `ALLOWED_UNIVERSES` | optional | Comma-separated list of allowed Roblox universe IDs. Leave empty to allow all. |
| `SPREADSHEET_ID` | optional | Google Sheets ID for logging & leaderboard |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | optional | Service account credentials JSON (for Sheets access) |
| `DISCORD_WEBHOOK_URL` | optional | Discord webhook URL for donation notifications |

> If the Sheets/Discord variables are not set, those integrations are simply skipped — the API still works.

---

## 🚀 Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/NavisAL04/donation-bridge.git
cd donation-bridge

# 2. Install dependencies
npm install

# 3. Set your environment variables (see table above)

# 4. Run locally
node server.js
```

### Deploy to Vercel

This project is configured for Vercel. Push to your repo and import it on [Vercel](https://vercel.com), then add the environment variables in the project settings.

---

## 🛠️ Tech Stack

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![Roblox](https://img.shields.io/badge/Roblox-00A2FF?style=for-the-badge&logo=roblox&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=for-the-badge&logo=googlesheets&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

---

## 👤 Author

**NavisAL** &mdash; Game Developer (Roblox & Lua)

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/NavisAL04)
[![YouTube](https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://youtube.com/@navisal04)
