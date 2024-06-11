import { Command, type CommandContext, Declare, Options, createStringOption } from "seyfert";
import { commandsResolver } from "../../package/utils/commandsResolver/commandsResolver";
const options = {
    query: createStringOption({ required: true, description: "pengu" })
}
@Declare({
    name: "search",
    description: "search command"
})
@Options(options)
export default class SearchCommand extends Command {

    run(ctx: CommandContext<typeof options>) {

        const resolve = commandsResolver(ctx.client, ctx.options.query);

        ctx.write({
            content: `\`\`\`js\n${JSON.stringify(resolve, null, 4)}\`\`\``
        })

    }
}