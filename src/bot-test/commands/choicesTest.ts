import { inspect } from "node:util";
import { Command, type CommandContext, Declare, Options, createNumberOption, createStringOption } from "seyfert";

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
export class ChoicesTestCommand extends Command {
    async run(ctx: CommandContext<typeof options>) {
        await ctx.write({
            content: inspect(ctx.options),
        });
    }
}
const optionsNumber = {
    choice: createNumberOption({
        description: "Penguins are life",
        required: true,
        choices: [
            { name: "Ganyu", value: 2 },
            { name: "Penwin", value: 3 },
            { name: "Furina", value: 4 },
            { name: "Arlecchino", value: 5.5344342 },
        ],
    }),
};

@Declare({
    name: "ch",
    description: "testing",
})
@Options(optionsNumber)
export default class ChoicesNumberTestCommand extends Command {
    async run(ctx: CommandContext<typeof optionsNumber>) {
        await ctx.write({
            content: inspect(ctx.options),
        });
    }
}
