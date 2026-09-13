const { Client, GatewayIntentBits, Partials, Events, MessageFlags } = require('discord.js');
require('dotenv').config();
const GiveawayManager = require('./GiveawayManager');
const BlacklistManager = require('./BlacklistManager');
const { REACTION_EMOJI, BOT_NAME, MIN_DURATION, MAX_DURATION } = require('./config');
const { parseDuration, pickWinners } = require('./utils');
const { buildGiveawayEmbed, buildCreationConfirmEmbed, buildWinnerAnnouncementEmbed, buildErrorEmbed, buildInfoEmbed, buildListEmbed } = require('./embeds');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.MessageContent],
    partials: [Partials.Message, Partials.Reaction, Partials.User],
});

const manager = new GiveawayManager();
const blacklistManager = new BlacklistManager();
const timers = new Map();

client.once(Events.ClientReady, async () => {
    console.log('');
    console.log('┌──────────────────────────────────────┐');
    console.log(`│  🍃 ${BOT_NAME} is ONLINE!           │`);
    console.log(`│  Logged in as: ${client.user.tag.padEnd(21)}│`);
    console.log(`│  Servers: ${String(client.guilds.cache.size).padEnd(26)}│`);
    console.log('└──────────────────────────────────────┘');
    console.log('');

    const activeGiveaways = manager.getActive();
    console.log(`[Boot] Resuming ${activeGiveaways.length} active giveaway(s)...`);
    for (const giveaway of activeGiveaways) {
        await syncReactions(giveaway.messageId);
        const remaining = giveaway.endTime - Date.now();
        if (remaining <= 0) await endGiveaway(giveaway.messageId);
        else scheduleEnd(giveaway.messageId, remaining);
    }

    client.user.setActivity('🎉 Giveaways | /giveaway', { type: 0 });
    setInterval(async () => {
        for (const giveaway of manager.getActive()) await syncReactions(giveaway.messageId);
    }, 10 * 1000);
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
    if (reaction.emoji.name !== REACTION_EMOJI) return;
    const giveaway = manager.get(reaction.message.id);
    if (!giveaway || giveaway.ended) return;
    if (manager.addEntry(reaction.message.id, user.id)) {
        console.log(`[Entry] ${user.tag} entered giveaway "${giveaway.prize}" (${giveaway.entries.length} total)`);
        await updateGiveawayMessage(giveaway);
    }
});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
    if (reaction.emoji.name !== REACTION_EMOJI) return;
    const giveaway = manager.get(reaction.message.id);
    if (!giveaway || giveaway.ended) return;
    if (manager.removeEntry(reaction.message.id, user.id)) {
        console.log(`[Entry Removed] ${user.tag} left giveaway "${giveaway.prize}" (${giveaway.entries.length} total)`);
        await updateGiveawayMessage(giveaway);
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'giveaway') return;
    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();
    try {
        if (subcommandGroup === 'blacklist') return await handleBlacklist(interaction);
        switch (subcommand) {
            case 'create': return await handleCreate(interaction);
            case 'end': return await handleEnd(interaction);
            case 'reroll': return await handleReroll(interaction);
            case 'list': return await handleList(interaction);
            case 'delete': return await handleDelete(interaction);
        }
    } catch (err) {
        console.error(`[Command Error] ${subcommand}:`, err);
        const errorEmbed = buildErrorEmbed('An unexpected error occurred. Please try again.');
        if (interaction.deferred || interaction.replied) await interaction.editReply({ embeds: [errorEmbed] }).catch(() => {});
        else await interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] }).catch(() => {});
    }
});

async function handleCreate(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const prize = interaction.options.getString('prize');
    const durationStr = interaction.options.getString('duration');
    const winnerCount = interaction.options.getInteger('winners') || 1;
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const requirementsStr = interaction.options.getString('requirements');
    const duration = parseDuration(durationStr);
    if (!duration) return interaction.editReply({ embeds: [buildErrorEmbed('Invalid duration format. Use formats like: `10s`, `30m`, `1h`, `1d`, `2d12h30m`')] });
    if (duration < MIN_DURATION) return interaction.editReply({ embeds: [buildErrorEmbed('Duration must be at least **10 seconds**.')] });
    if (duration > MAX_DURATION) return interaction.editReply({ embeds: [buildErrorEmbed('Duration cannot exceed **30 days**.')] });

    const requirements = requirementsStr ? requirementsStr.split('|').map(r => r.trim()).filter(Boolean) : [];
    const giveawayData = {
        prize, winnerCount, endTime: Date.now() + duration,
        hostId: interaction.user.id, channelId: channel.id, guildId: interaction.guild.id, requirements,
    };
    const embed = buildGiveawayEmbed(giveawayData, 'active');
    const giveawayMessage = await channel.send({ embeds: [embed] });
    await giveawayMessage.react(REACTION_EMOJI);
    giveawayData.messageId = giveawayMessage.id;
    manager.create(giveawayData);
    scheduleEnd(giveawayMessage.id, duration);
    await interaction.editReply({ embeds: [buildCreationConfirmEmbed(giveawayData)] });
    console.log(`[Giveaway Created] "${prize}" by ${interaction.user.tag} | ${winnerCount} winner(s) | Ends in ${durationStr}`);
}

async function handleEnd(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const messageId = interaction.options.getString('message_id');
    const giveaway = manager.get(messageId);
    if (!giveaway) return interaction.editReply({ embeds: [buildErrorEmbed('Giveaway not found. Make sure you provided the correct message ID.')] });
    if (giveaway.guildId !== interaction.guild.id) return interaction.editReply({ embeds: [buildErrorEmbed('That giveaway does not belong to this server.')] });
    if (giveaway.ended) return interaction.editReply({ embeds: [buildErrorEmbed('That giveaway has already ended.')] });
    await endGiveaway(messageId);
    await interaction.editReply({ embeds: [buildInfoEmbed('✅ Giveaway Ended', `The giveaway for **${giveaway.prize}** has been ended.`)] });
}

async function handleReroll(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const messageId = interaction.options.getString('message_id');
    const giveaway = manager.get(messageId);
    if (!giveaway) return interaction.editReply({ embeds: [buildErrorEmbed('Giveaway not found. Make sure you provided the correct message ID.')] });
    if (!giveaway.ended) return interaction.editReply({ embeds: [buildErrorEmbed('That giveaway is still active. End it first before rerolling.')] });
    const winnerCount = interaction.options.getInteger('winners') || giveaway.winnerCount;
    if (giveaway.entries.length === 0) return interaction.editReply({ embeds: [buildErrorEmbed('Cannot reroll — no entries were received for this giveaway.')] });

    const eligibleEntries = giveaway.entries.filter(userId => !blacklistManager.has(giveaway.guildId, userId));
    if (eligibleEntries.length === 0) return interaction.editReply({ embeds: [buildErrorEmbed('Cannot reroll — all entries are currently blacklisted from winning giveaways.')] });
    const newWinners = pickWinners(eligibleEntries, winnerCount);
    manager.reroll(messageId, newWinners);
    const updatedGiveaway = manager.get(messageId);
    await updateGiveawayMessage(updatedGiveaway, 'ended');
    try {
        const channel = await client.channels.fetch(giveaway.channelId);
        const winnerMentions = newWinners.map(id => `<@${id}>`).join(', ');
        await channel.send({ content: `🔄 **Giveaway Rerolled!**\n\n🏆 New winners for **${giveaway.prize}**: ${winnerMentions}\n\nCongratulations! 🎊` });
    } catch (err) { console.error('[Reroll] Failed to send announcement:', err.message); }
    await interaction.editReply({ embeds: [buildInfoEmbed('🔄 Winners Rerolled', `New winners have been selected for **${giveaway.prize}**.`)] });
    console.log(`[Reroll] "${giveaway.prize}" — New winners: ${newWinners.length}`);
}

async function handleList(interaction) {
    await interaction.reply({ embeds: [buildListEmbed(manager.getActiveByGuild(interaction.guild.id))], flags: [MessageFlags.Ephemeral] });
}

async function handleDelete(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const messageId = interaction.options.getString('message_id');
    const giveaway = manager.get(messageId);
    if (!giveaway) return interaction.editReply({ embeds: [buildErrorEmbed('Giveaway not found.')] });
    if (giveaway.guildId !== interaction.guild.id) return interaction.editReply({ embeds: [buildErrorEmbed('That giveaway does not belong to this server.')] });
    if (timers.has(messageId)) { clearTimeout(timers.get(messageId)); timers.delete(messageId); }
    try {
        const channel = await client.channels.fetch(giveaway.channelId);
        const message = await channel.messages.fetch(messageId);
        await message.delete();
    } catch (err) { console.warn('[Delete] Could not delete giveaway message:', err.message); }
    manager.delete(messageId);
    await interaction.editReply({ embeds: [buildInfoEmbed('🗑️ Giveaway Deleted', `The giveaway for **${giveaway.prize}** has been deleted.`)] });
    console.log(`[Deleted] "${giveaway.prize}"`);
}

async function handleBlacklist(interaction) {
    const action = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    if (action === 'add') {
        const user = interaction.options.getUser('user');
        if (user.bot) return interaction.reply({ embeds: [buildErrorEmbed('Bots cannot participate in giveaways.')], flags: [MessageFlags.Ephemeral] });
        const added = blacklistManager.add(guildId, user.id);
        if (!added) return interaction.reply({ embeds: [buildInfoEmbed('Already Blacklisted', `<@${user.id}> is already blocked from winning giveaways.`)], flags: [MessageFlags.Ephemeral] });
        await interaction.reply({ embeds: [buildInfoEmbed('🚫 User Blacklisted', `<@${user.id}> can still enter giveaways, but will not be eligible to win them.`)], flags: [MessageFlags.Ephemeral] });
        console.log(`[Blacklist] Added ${user.tag} (${user.id}) in guild ${guildId}`);
        return;
    }
    if (action === 'remove') {
        const user = interaction.options.getUser('user');
        const removed = blacklistManager.remove(guildId, user.id);
        if (!removed) return interaction.reply({ embeds: [buildErrorEmbed(`<@${user.id}> is not currently on the giveaway winner blacklist.`)], flags: [MessageFlags.Ephemeral] });
        await interaction.reply({ embeds: [buildInfoEmbed('✅ User Unblacklisted', `<@${user.id}> can now be selected as a giveaway winner.`)], flags: [MessageFlags.Ephemeral] });
        console.log(`[Blacklist] Removed ${user.tag} (${user.id}) in guild ${guildId}`);
        return;
    }
    if (action === 'list') {
        const users = blacklistManager.getAll(guildId);
        const description = users.length ? users.map((id, index) => `${index + 1}. <@${id}> (\`${id}\`)`).join('\n') : 'No users are currently blacklisted from winning giveaways.';
        return interaction.reply({ embeds: [buildInfoEmbed('🚫 Giveaway Winner Blacklist', description)], flags: [MessageFlags.Ephemeral] });
    }
    if (action === 'mass-add') {
        const input = interaction.options.getString('users', true);
        const userIds = [...new Set(input.split(/[\s,]+/).map(value => value.trim()).filter(Boolean).map(value => {
            const match = value.match(/^(?:<@!?(\d{17,20})>|(\d{17,20}))$/);
            return match?.[1] || match?.[2];
        }).filter(Boolean))];
        if (!userIds.length) return interaction.reply({ embeds: [buildErrorEmbed('No valid Discord user IDs or mentions were found.')], flags: [MessageFlags.Ephemeral] });
        if (userIds.length > 100) return interaction.reply({ embeds: [buildErrorEmbed('You can blacklist a maximum of 100 users per command.')], flags: [MessageFlags.Ephemeral] });
        const { added, alreadyBlacklisted } = blacklistManager.addMany(guildId, userIds);
        await interaction.reply({ embeds: [buildInfoEmbed('🚫 Mass Blacklist Complete', `Processed: **${userIds.length}**\nNewly blacklisted: **${added}**\nAlready blacklisted: **${alreadyBlacklisted}**\n\nThese users can still enter giveaways, but cannot be selected as winners.`)], flags: [MessageFlags.Ephemeral] });
        console.log(`[Blacklist] Mass-added ${added} user(s) in guild ${guildId}`);
    }
}

function scheduleEnd(messageId, delay) {
    if (timers.has(messageId)) clearTimeout(timers.get(messageId));
    const timer = setTimeout(() => endGiveaway(messageId), delay);
    timers.set(messageId, timer);
    console.log(`[Timer] Scheduled end for giveaway ${messageId} in ${Math.round(delay / 1000)}s`);
}

async function endGiveaway(messageId) {
    const giveaway = manager.get(messageId);
    if (!giveaway || giveaway.ended) return;
    await syncReactions(messageId);
    const syncedGiveaway = manager.get(messageId);
    console.log(`[Ending] Giveaway "${syncedGiveaway.prize}" with ${syncedGiveaway.entries.length} entries...`);
    const eligibleEntries = syncedGiveaway.entries.filter(userId => !blacklistManager.has(syncedGiveaway.guildId, userId));
    const winners = pickWinners(eligibleEntries, syncedGiveaway.winnerCount);
    console.log(`[Ending] Eligible entries: ${eligibleEntries.length}/${syncedGiveaway.entries.length} (${syncedGiveaway.entries.length - eligibleEntries.length} blacklisted)`);
    manager.end(messageId, winners);
    if (timers.has(messageId)) { clearTimeout(timers.get(messageId)); timers.delete(messageId); }
    const endedGiveaway = manager.get(messageId);
    await updateGiveawayMessage(endedGiveaway, 'ended');
    try {
        const channel = await client.channels.fetch(giveaway.channelId);
        if (winners.length) {
            const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
            await channel.send({ content: `🎉 **GIVEAWAY ENDED** 🎉\n\n🏆 Winners for **${giveaway.prize}**: ${winnerMentions}\n\nCongratulations! 🎊`, embeds: [buildWinnerAnnouncementEmbed(endedGiveaway)], reply: { messageReference: messageId, failIfNotExists: false } });
        } else {
            await channel.send({ content: `🎉 **GIVEAWAY ENDED** 🎉\n\n😢 No valid entries for **${giveaway.prize}**. No winners could be selected.`, reply: { messageReference: messageId, failIfNotExists: false } });
        }
    } catch (err) { console.error('[End] Failed to send winner announcement:', err.message); }
    console.log(`[Ended] "${giveaway.prize}" — Winners: ${winners.length ? winners.join(', ') : 'None'}`);
}

async function updateGiveawayMessage(giveaway, status) {
    try {
        const channel = await client.channels.fetch(giveaway.channelId);
        const message = await channel.messages.fetch(giveaway.messageId);
        const currentStatus = status || (giveaway.ended ? 'ended' : 'active');
        await message.edit({ embeds: [buildGiveawayEmbed(giveaway, currentStatus)] });
    } catch (err) { console.error('[Update] Failed to update giveaway message:', err.message); }
}

async function syncReactions(messageId) {
    const giveaway = manager.get(messageId);
    if (!giveaway || giveaway.ended) return;
    try {
        const channel = await client.channels.fetch(giveaway.channelId);
        const message = await channel.messages.fetch(messageId);
        const reaction = message.reactions.cache.find(r => r.emoji.name === REACTION_EMOJI);
        if (!reaction) return;
        const reactors = await reaction.users.fetch();
        const actualEntries = new Set();
        reactors.forEach(user => { if (!user.bot) actualEntries.add(user.id); });
        const storedEntries = new Set(giveaway.entries);
        let changed = false;
        for (const userId of actualEntries) {
            if (!storedEntries.has(userId)) { giveaway.entries.push(userId); changed = true; console.log(`[Sync] Added missing entry: ${userId}`); }
        }
        giveaway.entries = giveaway.entries.filter(id => {
            if (!actualEntries.has(id)) { changed = true; console.log(`[Sync] Removed stale entry: ${id}`); return false; }
            return true;
        });
        if (changed) { manager.save(); await updateGiveawayMessage(giveaway); console.log(`[Sync] Giveaway "${giveaway.prize}" synced: ${giveaway.entries.length} entries`); }
    } catch (err) { console.error(`[Sync] Failed to sync reactions for ${messageId}:`, err.message); }
}

client.login(process.env.DISCORD_TOKEN);
