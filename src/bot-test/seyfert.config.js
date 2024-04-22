const { config } = require("seyfert");

module.exports = config.bot({
    token: process.env.BOT_TOKEN ?? "",
    intents: ["Guilds", "GuildMessages", "MessageContent", "GuildMembers"],
    locations: {
        base: ".",
        output: "../../dist/bot-test", //If you are using bun, set "src" instead
        commands: "commands",
        events: "events",
    },
});
