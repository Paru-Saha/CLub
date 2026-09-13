const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage giveaways for The Mint Club')
        .addSubcommand(sub =>
            sub.setName('create')
                .setDescription('Create a new giveaway')
                .addStringOption(opt => opt.setName('prize').setDescription('What is being given away?').setRequired(true))
                .addStringOption(opt => opt.setName('duration').setDescription('How long? e.g. 1h, 30m, 1d').setRequired(true))
                .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners (default: 1)').setMinValue(1).setMaxValue(50))
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel for the giveaway').addChannelTypes(ChannelType.GuildText))
                .addStringOption(opt => opt.setName('requirements').setDescription('Requirements separated by |'))
        )
        .addSubcommand(sub =>
            sub.setName('end').setDescription('End a giveaway early')
                .addStringOption(opt => opt.setName('message_id').setDescription('Giveaway message ID').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('reroll').setDescription('Reroll winners for an ended giveaway')
                .addStringOption(opt => opt.setName('message_id').setDescription('Ended giveaway message ID').setRequired(true))
                .addIntegerOption(opt => opt.setName('winners').setDescription('Number of new winners').setMinValue(1).setMaxValue(50))
        )
        .addSubcommand(sub => sub.setName('list').setDescription('List all active giveaways in this server'))
        .addSubcommand(sub =>
            sub.setName('delete').setDescription('Delete a giveaway')
                .addStringOption(opt => opt.setName('message_id').setDescription('Giveaway message ID').setRequired(true))
        )
        .addSubcommandGroup(group =>
            group.setName('blacklist').setDescription('Manage users who cannot win giveaways')
                .addSubcommand(action => action.setName('add').setDescription('Blacklist a user from winning giveaways')
                    .addUserOption(opt => opt.setName('user').setDescription('User who should not be eligible to win').setRequired(true)))
                .addSubcommand(action => action.setName('remove').setDescription('Remove a user from the winner blacklist')
                    .addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true)))
                .addSubcommand(action => action.setName('list').setDescription('List users blocked from winning giveaways'))
                .addSubcommand(action => action.setName('mass-add').setDescription('Blacklist multiple users at once')
                    .addStringOption(opt => opt.setName('users').setDescription('User IDs or @mentions separated by spaces, commas, or new lines').setRequired(true)))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
];

module.exports = commands.map(cmd => cmd.toJSON());
