# 🍃 The Mint Club — Discord Giveaway Bot

A custom Discord giveaway bot where users enter by reacting with 🎉. Every reaction counts as one entry.

![Discord.js](https://img.shields.io/badge/discord.js-v14-blue)

---

## ✨ Features

- **🎉 Reaction-based entries** — Users react with 🎉 to enter; removing the reaction removes the entry
- **⏰ Auto-ending** — Giveaways automatically end when the timer expires
- **🏆 Random winner selection** — Fair randomized winner picking
- **🔄 Reroll winners** — Reroll winners for ended giveaways
- **📋 Requirements support** — Add follow/task requirements to your giveaway embed
- **💾 Persistent data** — Giveaways survive bot restarts
- **📊 Live entry count** — Embed updates with entry count in real-time
- **🗑️ Delete giveaways** — Clean up old or mistaken giveaways
- **🚫 Winner blacklist** — Blacklisted users can still enter but can never be selected as winners
- **👥 Mass blacklist** — Blacklist up to 100 users at once using IDs or mentions

---

## 🚀 Setup

### 1. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"** → name it **The Mint Club**
3. Go to **Bot** tab → click **"Reset Token"** → copy the token
4. Enable these **Privileged Gateway Intents**:
   - ✅ Message Content Intent
   - ✅ Server Members Intent (optional, for future features)
5. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Manage Messages`, `Read Message History`, `Add Reactions`, `Use External Emojis`, `Embed Links`
6. Copy the generated URL and invite the bot to your server

### 2. Configure the Bot

```bash
cd the-mint-club-bot
nano .env
```

Fill in your `.env`:
```
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
```

### 3. Register Slash Commands

```bash
npm run deploy
```

### 4. Start the Bot

```bash
npm start
npm run dev
```

---

## 📖 Commands

All commands require **Manage Server** permission.

| Command | Description |
|---------|-------------|
| `/giveaway create` | Create a new giveaway |
| `/giveaway end` | End a giveaway early |
| `/giveaway reroll` | Reroll winners for an ended giveaway |
| `/giveaway list` | List all active giveaways |
| `/giveaway delete` | Delete a giveaway |
| `/giveaway blacklist add` | Blacklist one user from winning |
| `/giveaway blacklist remove` | Remove one user from the blacklist |
| `/giveaway blacklist list` | List blacklisted users |
| `/giveaway blacklist mass-add` | Blacklist up to 100 users at once |

### Examples

```text
/giveaway create prize:5 GTD spots from catbonkers duration:2h winners:5
/giveaway end message_id:1234567890
/giveaway reroll message_id:1234567890 winners:3
/giveaway blacklist add user:@user
/giveaway blacklist remove user:@user
/giveaway blacklist list
/giveaway blacklist mass-add users:@user1 @user2 123456789012345678
```

---

## 🎯 How It Works

1. Host creates a giveaway using `/giveaway create`.
2. Bot posts an embed and reacts with 🎉.
3. Users react with 🎉 to enter — each reaction = 1 entry.
4. Entry count updates in real-time.
5. When the timer expires, bot randomly selects winners from eligible entries.
6. Blacklisted users remain visible in the entry count but are excluded from winner selection.
7. Host can reroll winners; blacklisted users remain excluded.

---

## 🛡️ Required Bot Permissions

- Send Messages
- Embed Links
- Add Reactions
- Read Message History
- Manage Messages
- Use External Emojis

---

## 📝 License

ISC
