import { type CommandContext, Declare, Group, LimitedCollection, Options, SubCommand, createStringOption } from "seyfert";
import { Shortcut } from "../../../package/utils/commandsResolver/decorators";

const options = {
    pengu: createStringOption({
        required: true,
        description: "pengu",
    }),
};

@Declare({
    name: "create",
    description: "create a new something",
    aliases: ["cr"],
})
@Options(options)
@Group("pengu")
@Shortcut()
export default class CreateCommand extends SubCommand {
    run(ctx: CommandContext<typeof options>) {
        // some logic there
        LimitedCollection;
        ctx.write({
            content: `create command executed ${ctx.options.pengu}`,
        });
    }
}
