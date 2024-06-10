import { Command, type CommandContext, Declare } from "seyfert";
import { createMessageWatcher } from "../../package/utils/messageWatcher/watcherController";

@Declare({
    name: "ping",
    description: "Show the ping with discord",
})
export default class PingCommand extends Command {
    async run(ctx: CommandContext) {
        // average latency between shards
        const ping = ctx.client.gateway.latency;

        const watcher = createMessageWatcher.call({ message: ctx.message!, ctx }, { idle: 220000 });

        watcher.onChange(() => {
            ctx.write({ content: "cambio detected" })
        })
        watcher.onStop((reason) => {
            ctx.write({ content: `watcher muerto, "${reason}"` })
        })

        await ctx.write({
            content: `The ping is \`${ping}\``,
        });
    }
}
