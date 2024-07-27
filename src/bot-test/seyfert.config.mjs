import { config } from "seyfert";

export default config.bot({
    token: process.env.BOT_TOKEN ?? "",
    intents: ["Guilds", "GuildMessages", "MessageContent", "GuildMembers"],
    locations: {
        base: ".",
        output: "../../dist/bot-test",
        commands: "commands",
        events: "events",
    },
});
