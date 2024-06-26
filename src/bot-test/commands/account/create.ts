import { type CommandContext, Declare, Options, SubCommand, createStringOption } from "seyfert";

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
export default class CreateCommand extends SubCommand {
    run(ctx: CommandContext<typeof options>) {
        // some logic there

        ctx.write({
            content: `create command executed ${ctx.options.pengu}`,
        });
    }
}
