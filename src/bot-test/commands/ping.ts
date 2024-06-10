import { Command, type CommandContext, Declare } from "seyfert";
import { createMessageWatcher } from "../../package/utils/messageWatcher/messageWatcher";

@Declare({
    name: "ping",
    description: "Show the ping with discord",
})
export default class PingCommand extends Command {
    async run(ctx: CommandContext) {
        // average latency between shards
        const ping = ctx.client.gateway.latency;

        createMessageWatcher.call({ message: ctx.message!, ctx }, { idle: 220000 });

        await ctx.write({
            content: `The ping is \`${ping}\``,
        });
    }
}
