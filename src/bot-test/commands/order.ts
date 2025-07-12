import { Command, type CommandContext, Declare, Embed, Options, createIntegerOption, createStringOption, createUserOption } from "seyfert";
import { Yuna } from "#package";
import { codeBlock } from "./eval";

const options = {
    int: createIntegerOption({
        description: "What time",
        required: true,
    }),
    text: createStringOption({
        description: "What to say",
        required: true,
    }),
    user: createUserOption({
        description: "What user",
        required: true,
    }),
    // boolean: createBooleanOption({
    // description: "What boolean",
    // required: true,
    // }),
};

@Declare({
    name: "order",
    description: "order something",
})
@Options(options)
export default class OrderCommand extends Command {
    async run(ctx: CommandContext<typeof options>) {
        await ctx.editOrReply({
            embeds: [
                new Embed().setColor("Purple").setFields([
                    {
                        name: "resolved order",
                        value: codeBlock("json", JSON.stringify(Yuna.getArgsResult(ctx.message)?.result)),
                    },
                    {
                        name: "original order",
                        value: codeBlock("json", JSON.stringify(this.options?.map((option) => option.name))),
                    },
                ]),
            ],
        });
    }
}
