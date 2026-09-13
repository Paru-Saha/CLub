const { REST, Routes } = require('discord.js');
const commands = require('./commands');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`🔄 Registering ${commands.length} slash command(s)...`);
        const data = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log(`✅ Successfully registered ${data.length} command(s) globally.`);
        console.log('⚠️  Note: Global commands may take up to 1 hour to propagate.');
    } catch (err) {
        console.error('❌ Failed to register commands:', err);
    }
})();
