import { Command, type CommandContext, createStringOption, Declare, Embed, Options } from "seyfert";
import { codeBlock } from "./eval";

const options = {
    lang: createStringOption({
        description: "language",
    }),
    code: createStringOption({
        description: "code",
    }),
};
@Declare({
    name: "run",
    description: "run code",
})
@Options(options)
export default class RunCommand extends Command {
    override async run(ctx: CommandContext<typeof options>) {
        const { lang, code } = ctx.options;

        await ctx.write({
            embeds: [
                new Embed().setTitle("Run code").addFields([
                    {
                        name: "Language",
                        value: codeBlock("", lang ?? "No Language Specified"),
                    },
                    {
                        name: "Code",
                        value: codeBlock(lang!, code!),
                    },
                ]),
            ],
        });
    }
}
