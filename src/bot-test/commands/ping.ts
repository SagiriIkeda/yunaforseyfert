import { Command, type CommandContext, Declare } from "seyfert";

@Declare({
    name: "ping",
    description: "Show the ping with discord",
})
export default class PingCommand extends Command {
    override async run(ctx: CommandContext) {
        // average latency between shards
        const ping = ctx.client.latency;

        await ctx.write({
            content: `The ping is \`${ping}\``,
        });
    }
}
