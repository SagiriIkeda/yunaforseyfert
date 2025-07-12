import {
    Command,
    type CommandContext,
    Declare,
    Embed,
    Options,
    createBooleanOption,
    createNumberOption,
    createStringOption,
} from "seyfert";
import { Yuna } from "#package";
import { codeBlock } from "./eval";

const options = {
    time: createNumberOption({
        description: "What time",
        required: true,
    }),
    text: createStringOption({
        description: "What to say",
        required: true,
    }),
    boolean: createBooleanOption({
        description: "What boolean",
        required: true,
    }),
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
                        name: "resolved",
                        value: codeBlock(JSON.stringify(Yuna.getArgsResult(ctx.message)?.result), "json"),
                    },
                    {
                        name: "raw order",
                        value: codeBlock(JSON.stringify(this.options?.map((option) => option.name)), "json"),
                    },
                ]),
            ],
        });
    }
}
