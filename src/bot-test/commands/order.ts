import { Command, type CommandContext, Declare, Options, createBooleanOption, createNumberOption, createStringOption } from "seyfert";
import { Yuna } from "#package";

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
    run(ctx: CommandContext<typeof options>) {
        const test = Yuna.getArgsResult(ctx.message);

        console.debug({ test });

        // await ctx.editOrReply({
        //     embeds: [
        //         new Embed().setColor("Purple").setFields([
        //             {
        //                 name: "resolved",
        //                 value: (JSON.stringify(Yuna.getArgsResult(ctx.message)), ""),
        //             },
        //             {
        //                 name: "raw order",
        //                 value: (JSON.stringify(this.options?.map(option => option.name)), ""),
        //             }
        //         ]),

        //     ]
        // });
    }
}
