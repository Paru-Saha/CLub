const fs = require('fs');
const { DATA_FILE } = require('./config');

const dataPath = DATA_FILE;

/**
 * GiveawayManager handles CRUD operations and persistence for giveaways
 */
class GiveawayManager {
    constructor() {
        this.giveaways = new Map();
        this.ensureDataDirectory();
        this.load();
    }

    ensureDataDirectory() {
        try {
            fs.mkdirSync(require('path').dirname(dataPath), { recursive: true });
        } catch (err) {
            console.error('[GiveawayManager] Failed to prepare data directory:', err.message);
        }
    }

    load() {
        try {
            if (fs.existsSync(dataPath)) {
                const raw = fs.readFileSync(dataPath, 'utf-8');
                const data = JSON.parse(raw);
                for (const [id, giveaway] of Object.entries(data)) {
                    this.giveaways.set(id, giveaway);
                }
                console.log(`[GiveawayManager] Loaded ${this.giveaways.size} giveaway(s) from disk.`);
            }
        } catch (err) {
            console.error('[GiveawayManager] Failed to load giveaways:', err.message);
        }
    }

    save() {
        try {
            this.ensureDataDirectory();
            const data = Object.fromEntries(this.giveaways);
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (err) {
            console.error('[GiveawayManager] Failed to save giveaways:', err.message);
        }
    }

    create(giveawayData) {
        const id = `${giveawayData.messageId}`;
        const giveaway = {
            ...giveawayData,
            entries: [],
            winners: [],
            ended: false,
            createdAt: Date.now(),
        };
        this.giveaways.set(id, giveaway);
        this.save();
        return giveaway;
    }

    get(messageId) {
        return this.giveaways.get(messageId);
    }

    getActive() {
        return [...this.giveaways.values()].filter(g => !g.ended);
    }

    getActiveByGuild(guildId) {
        return [...this.giveaways.values()].filter(g => !g.ended && g.guildId === guildId);
    }

    getAllByGuild(guildId) {
        return [...this.giveaways.values()].filter(g => g.guildId === guildId);
    }

    addEntry(messageId, userId) {
        const giveaway = this.giveaways.get(messageId);
        if (!giveaway || giveaway.ended) return false;
        if (giveaway.entries.includes(userId)) return false;

        giveaway.entries.push(userId);
        this.save();
        return true;
    }

    removeEntry(messageId, userId) {
        const giveaway = this.giveaways.get(messageId);
        if (!giveaway || giveaway.ended) return false;

        const index = giveaway.entries.indexOf(userId);
        if (index === -1) return false;

        giveaway.entries.splice(index, 1);
        this.save();
        return true;
    }

    end(messageId, winners) {
        const giveaway = this.giveaways.get(messageId);
        if (!giveaway) return null;

        giveaway.ended = true;
        giveaway.winners = winners;
        giveaway.endedAt = Date.now();
        this.save();
        return giveaway;
    }

    delete(messageId) {
        const result = this.giveaways.delete(messageId);
        if (result) this.save();
        return result;
    }

    reroll(messageId, newWinners) {
        const giveaway = this.giveaways.get(messageId);
        if (!giveaway || !giveaway.ended) return null;

        giveaway.winners = newWinners;
        this.save();
        return giveaway;
    }
}

module.exports = GiveawayManager;
