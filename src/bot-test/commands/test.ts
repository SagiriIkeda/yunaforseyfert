import { Command, type CommandContext, Declare, Embed, Options, createStringOption } from "seyfert";

const options = {
    first: createStringOption({
        description: "Penguins are life",
        required: true,
    }),
    second: createStringOption({
        description: "Do you know i love penguins?",
        required: true,
    }),
};

@Declare({
    name: "t",
    description: "testing",
})
@Options(options)
export default class TestCommand extends Command {
    async run(ctx: CommandContext<typeof options>) {
        const embed = new Embed({
            title: "Parsed!",
            fields: [
                {
                    name: "input",
                    value: `\`\`\`js\n${ctx.message?.content}\`\`\``,
                },
                {
                    name: "Output",
                    value: `\`\`\`js\n${JSON.stringify(ctx.options, null, 4)}\`\`\``,
                },
            ],
        });

        await ctx.write({
            embeds: [embed],
        });
    }

    async onOptionsError(context: CommandContext<typeof options>) {
        await context.editOrReply({
            content: "You need to use two options",
        });
    }
}
