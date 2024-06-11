import { Command, type CommandContext, Declare } from "seyfert";

@Declare({
    name: "ping",
    description: "Show the ping with discord",
})
export default class PingCommand extends Command {
    async run(ctx: CommandContext) {
        // average latency between shards
        const ping = ctx.client.gateway.latency;

        const watcher = ctx.createWatcher();

        watcher.onChange((message) => {
            console.log(message.content);
        })
        watcher.onStop((reason) => {
            ctx.write({ content: `watcher muerto, "${reason}"` })
        })

        await ctx.write({
            content: `The ping is \`${ping}\``,
        });
    }
}
