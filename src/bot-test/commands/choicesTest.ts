import { inspect } from "node:util";
import { Command, type CommandContext, Declare, Options, createStringOption } from "seyfert";

const options = {
    choice: createStringOption({
        description: "Penguins are life",
        required: true,
        choices: [
            { name: "Ganyu", value: "Ganyu Supremacy" },
            { name: "Penwin", value: "Penwi Squad" },
            { name: "Furina", value: "Furina" },
            { name: "Arlecchino", value: "The Knave" },
        ],
    }),
};

@Declare({
    name: "ch",
    description: "testing",
})
@Options(options)
export default class ChoicesTestCommand extends Command {
    async run(ctx: CommandContext<typeof options>) {
        await ctx.write({
            content: inspect(ctx.options),
        });
    }
}
