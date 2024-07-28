import { Command, type CommandContext, Declare, Embed, Options, createStringOption } from "seyfert";

function codeBlock(lang: string, code: string) {
    return `\`\`\`${lang}\n${code}\n\`\`\``;
}

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
    async run(ctx: CommandContext<typeof options>) {
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
