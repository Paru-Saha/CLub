const ms = require('ms');

function parseDuration(input) {
    const compoundRegex = /(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/;
    const match = input.match(compoundRegex);

    if (match && (match[1] || match[2] || match[3] || match[4])) {
        const days = parseInt(match[1] || 0);
        const hours = parseInt(match[2] || 0);
        const minutes = parseInt(match[3] || 0);
        const seconds = parseInt(match[4] || 0);
        return ((days * 86400) + (hours * 3600) + (minutes * 60) + seconds) * 1000;
    }

    const result = ms(input);
    return result || null;
}

function formatDuration(milliseconds) {
    if (milliseconds < 0) return 'Ended';
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        const remainHours = hours % 24;
        return remainHours > 0 ? `${days} day(s), ${remainHours} hour(s)` : `${days} day(s)`;
    }
    if (hours > 0) {
        const remainMinutes = minutes % 60;
        return remainMinutes > 0 ? `${hours} hour(s), ${remainMinutes} minute(s)` : `${hours} hour(s)`;
    }
    if (minutes > 0) return `${minutes} minute(s)`;
    return `${seconds} second(s)`;
}

function discordTimestamp(timestamp, style = 'R') {
    return `<t:${Math.floor(timestamp / 1000)}:${style}>`;
}

function pickWinners(entries, count) {
    const shuffled = [...entries].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

module.exports = { parseDuration, formatDuration, discordTimestamp, pickWinners };
