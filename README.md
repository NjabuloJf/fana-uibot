# 🤖 LARA LITE - WhatsApp Multi-Device Bot

**Created by Sadeesha Coder**

## 🚀 Quick Setup (VPS)

### 1. Upload & Install
```bash
# Upload files to your VPS, then:
cd lara-lite-bot
npm install
```

### 2. Configure
```bash
cp .env.example .env
nano .env
# Set your WEBSITE_URL to your Lovable site
```

### 3. Run
```bash
# Direct run
node index.js

# With PM2 (recommended for 24/7)
npm install -g pm2
pm2 start index.js --name lara-lite
pm2 save
pm2 startup
```

### 4. Connect Website
Update your Lovable website's PairingCard to point to:
```
https://your-vps-ip:3000/api/pair
```

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pair` | POST | Generate pairing code `{ phone: "94..." }` |
| `/api/status` | GET | Bot status & info |
| `/api/sessions` | GET | Active sessions list |

## 🔧 Commands

| Command | Description |
|---------|-------------|
| `.alive` | Check bot status |
| `.menu` | Show all commands |
| `.song <name>` | Search & download song |
| `.video <name>` | Search & download video |
| `.sticker` | Create sticker from image |
| `.weather <city>` | Get weather info |
| `.kick @user` | Remove from group |
| `.joke` | Random joke |
| And more... | Type `.menu` in WhatsApp |

## ⚡ Features
- ✅ Auto view status
- ✅ Auto react to status
- ✅ Auto recording presence
- ✅ Multi-device support
- ✅ Auto reconnect
- ✅ Session persistence
- ✅ REST API for website pairing

---
ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴇᴇꜱʜᴀ ᴄᴏᴅᴇʀ
