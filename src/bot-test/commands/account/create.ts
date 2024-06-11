import { type CommandContext, Declare, Options, SubCommand, createStringOption, Group } from "seyfert";
import { LinkToRootPath } from "../../../package/utils/commandsResolver/init";

const options = {
    pengu: createStringOption({
        required: true,
        description: "pengu",
    }),
};

@Declare({
    name: "create",
    description: "create a new something",
})
@Options(options)
@Group("pengu")
@LinkToRootPath()
export default class CreateCommand extends SubCommand {
    run(ctx: CommandContext<typeof options>) {
        // some logic there

        ctx.write({
            content: `create command executed ${ctx.options.pengu}`,
        });
    }
}
