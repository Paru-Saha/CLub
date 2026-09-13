const fs = require('fs');
const path = require('path');
const { BLACKLIST_FILE } = require('./config');

const dataPath = path.join(__dirname, '..', BLACKLIST_FILE);

/**
 * BlacklistManager stores users who may enter giveaways but can never win.
 * Blacklists are scoped to a Discord server (guild).
 */
class BlacklistManager {
    constructor() {
        this.blacklists = new Map(); // guildId -> Set(userId)
        this.load();
    }

    load() {
        try {
            if (!fs.existsSync(dataPath)) return;

            const raw = fs.readFileSync(dataPath, 'utf-8');
            const data = JSON.parse(raw);

            for (const [guildId, userIds] of Object.entries(data)) {
                this.blacklists.set(guildId, new Set(Array.isArray(userIds) ? userIds : []));
            }

            console.log(`[BlacklistManager] Loaded ${this.blacklists.size} server blacklist(s) from disk.`);
        } catch (err) {
            console.error('[BlacklistManager] Failed to load blacklist:', err.message);
        }
    }

    save() {
        try {
            const data = {};

            for (const [guildId, userIds] of this.blacklists.entries()) {
                data[guildId] = [...userIds];
            }

            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (err) {
            console.error('[BlacklistManager] Failed to save blacklist:', err.message);
        }
    }

    add(guildId, userId) {
        if (!this.blacklists.has(guildId)) {
            this.blacklists.set(guildId, new Set());
        }

        const users = this.blacklists.get(guildId);
        if (users.has(userId)) return false;

        users.add(userId);
        this.save();
        return true;
    }

    addMany(guildId, userIds) {
        if (!this.blacklists.has(guildId)) {
            this.blacklists.set(guildId, new Set());
        }

        const users = this.blacklists.get(guildId);
        let added = 0;
        let alreadyBlacklisted = 0;

        for (const userId of userIds) {
            if (users.has(userId)) {
                alreadyBlacklisted++;
                continue;
            }

            users.add(userId);
            added++;
        }

        if (added > 0) this.save();

        return { added, alreadyBlacklisted };
    }

    remove(guildId, userId) {
        const users = this.blacklists.get(guildId);
        if (!users || !users.has(userId)) return false;

        users.delete(userId);
        if (users.size === 0) {
            this.blacklists.delete(guildId);
        }

        this.save();
        return true;
    }

    has(guildId, userId) {
        return this.blacklists.get(guildId)?.has(userId) || false;
    }

    getAll(guildId) {
        return [...(this.blacklists.get(guildId) || new Set())];
    }
}

module.exports = BlacklistManager;
