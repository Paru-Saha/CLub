const { EmbedBuilder } = require('discord.js');
const { COLORS, BOT_FOOTER, REACTION_EMOJI } = require('./config');
const { discordTimestamp } = require('./utils');

function buildGiveawayEmbed(giveaway, status = 'active') {
    const embed = new EmbedBuilder().setTitle(`${REACTION_EMOJI}  ${giveaway.prize}`);
    let description = '';

    if (giveaway.requirements && giveaway.requirements.length > 0) {
        description += '**Requirements:**\n';
        giveaway.requirements.forEach(req => { description += `→ ${req}\n`; });
        description += '\n';
    }

    description += `**React below** 👇\nReact with ${REACTION_EMOJI} to enter!\n\n`;

    if (status === 'active') {
        embed.setColor(COLORS.ACTIVE);
        description += `⏰ Ends: ${discordTimestamp(giveaway.endTime)} (${discordTimestamp(giveaway.endTime, 'F')})\n`;
        description += `🎯 Winners: **${giveaway.winnerCount}**\n`;
        description += `🎫 Entries: **${giveaway.entries ? giveaway.entries.length : 0}**\n`;
        description += `🎭 Hosted by: <@${giveaway.hostId}>\n`;
    } else if (status === 'ended') {
        embed.setColor(COLORS.ENDED);
        const endedAgo = Date.now() - giveaway.endTime;
        const daysAgo = Math.floor(endedAgo / (1000 * 60 * 60 * 24));
        const hoursAgo = Math.floor(endedAgo / (1000 * 60 * 60));
        let endedText = daysAgo > 0 ? `${daysAgo} day(s) ago` : hoursAgo > 0 ? `${hoursAgo} hour(s) ago` : 'just now';

        description += `⏰ Ended: ${endedText} (${discordTimestamp(giveaway.endTime, 'F')})\n`;
        description += `🎭 Hosted by: <@${giveaway.hostId}>\n`;
        description += `🎫 Entries: **${giveaway.entries ? giveaway.entries.length : 0}**\n`;
        if (giveaway.winners && giveaway.winners.length > 0) {
            description += `🏆 Winners: ${giveaway.winners.map(id => `<@${id}>`).join(', ')}\n`;
        } else {
            description += '🏆 Winners: *No valid entries*\n';
        }
    }

    return embed.setDescription(description).setFooter({ text: BOT_FOOTER }).setTimestamp(status === 'ended' ? giveaway.endTime : Date.now());
}

function buildCreationConfirmEmbed(giveaway) {
    return new EmbedBuilder().setColor(COLORS.SUCCESS).setTitle('✅ Giveaway Created!')
        .setDescription(`**Prize:** ${giveaway.prize}\n**Winners:** ${giveaway.winnerCount}\n**Duration:** Ends ${discordTimestamp(giveaway.endTime)}\n**Channel:** <#${giveaway.channelId}>\n\nUsers can enter by reacting with ${REACTION_EMOJI}`)
        .setFooter({ text: BOT_FOOTER }).setTimestamp();
}

function buildWinnerAnnouncementEmbed(giveaway) {
    const embed = new EmbedBuilder().setColor(COLORS.SUCCESS).setTitle(`${REACTION_EMOJI}  Giveaway Ended!`).setTimestamp().setFooter({ text: BOT_FOOTER });
    if (giveaway.winners && giveaway.winners.length > 0) {
        embed.setDescription(`**Prize:** ${giveaway.prize}\n\n🏆 **Winners:**\n${giveaway.winners.map(id => `<@${id}>`).join(', ')}\n\nCongratulations! 🎊`);
    } else {
        embed.setDescription(`**Prize:** ${giveaway.prize}\n\n😢 No valid entries were received.\nNo winners could be selected.`);
    }
    return embed;
}

function buildErrorEmbed(message) {
    return new EmbedBuilder().setColor(COLORS.ERROR).setDescription(`❌ ${message}`).setFooter({ text: BOT_FOOTER });
}

function buildInfoEmbed(title, message) {
    return new EmbedBuilder().setColor(COLORS.INFO).setTitle(title).setDescription(message).setFooter({ text: BOT_FOOTER }).setTimestamp();
}

function buildListEmbed(giveaways) {
    const embed = new EmbedBuilder().setColor(COLORS.INFO).setTitle(`${REACTION_EMOJI} Active Giveaways`).setFooter({ text: BOT_FOOTER }).setTimestamp();
    if (giveaways.length === 0) return embed.setDescription('No active giveaways at the moment.');
    let description = '';
    giveaways.forEach((g, i) => {
        description += `**${i + 1}.** ${g.prize}\n`;
        description += `   ├ Winners: **${g.winnerCount}** | Entries: **${g.entries.length}**\n`;
        description += `   ├ Ends: ${discordTimestamp(g.endTime)}\n`;
        description += `   └ [Jump to Giveaway](https://discord.com/channels/${g.guildId}/${g.channelId}/${g.messageId})\n\n`;
    });
    return embed.setDescription(description);
}

module.exports = { buildGiveawayEmbed, buildCreationConfirmEmbed, buildWinnerAnnouncementEmbed, buildErrorEmbed, buildInfoEmbed, buildListEmbed };
