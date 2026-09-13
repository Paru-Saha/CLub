module.exports = {
    // Giveaway reaction emoji
    REACTION_EMOJI: '🎉',

    // Embed colors
    COLORS: {
        ACTIVE: 0x00FF9D,
        ENDING_SOON: 0xFFAA00,
        ENDED: 0x2F3136,
        ERROR: 0xFF4444,
        SUCCESS: 0x00FF9D,
        INFO: 0x5865F2,
    },

    // Bot branding
    BOT_NAME: 'The Mint Club',
    BOT_FOOTER: '🍃 The Mint Club • Giveaways',

    // Time constants
    MIN_DURATION: 10 * 1000,
    MAX_DURATION: 30 * 24 * 60 * 60 * 1000,

    // Persistence files
    DATA_FILE: 'giveaways.json',
    BLACKLIST_FILE: 'blacklist.json',
};
