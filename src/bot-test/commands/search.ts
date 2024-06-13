import { Command, type CommandContext, Declare, Options, createStringOption } from "seyfert";
import { baseResolver } from "../../package/utils/commandsResolver/base";
const options = {
    query: createStringOption({ required: true, description: "pengu" }),
};
@Declare({
    name: "search",
    description: "search command",
})
@Options(options)
export default class SearchCommand extends Command {
    run(ctx: CommandContext<typeof options>) {
        const resolve = baseResolver(ctx.client, ctx.options.query, { useFallbackSubCommand: true })?.command;

        ctx.write({
            content: `\`\`\`js\n${JSON.stringify(resolve, null, 4)}\`\`\``,
        });
    }
}
