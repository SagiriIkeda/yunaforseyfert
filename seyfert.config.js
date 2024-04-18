import { config } from 'seyfert';

export default config.bot({
   token: process.env.BOT_TOKEN ?? "",
   intents: ["Guilds", "GuildMessages", "MessageContent", "GuildMembers"],
   locations: {
       base: "src/test",
       output: "dist/test", //If you are using bun, set "src" instead
       commands: "commands",
       events: "events"
   }
});