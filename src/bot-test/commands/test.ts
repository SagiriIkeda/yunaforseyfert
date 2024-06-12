import { inspect } from "node:util";
import { Command, type CommandContext, Declare, Embed, type Message, Options, createStringOption } from "seyfert";
import { createWatcher } from "../../package/utils/messageWatcher/prepare";

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
        const createEmbed = (options: typeof ctx.options, message: Pick<Message, "content">) => {
            //code
            return new Embed({
                title: "Parsed!",
                fields: [
                    {
                        name: "input",
                        value: `\`\`\`js\n${message?.content}\`\`\``,
                    },
                    {
                        name: "Output",
                        value: `\`\`\`js\n${inspect(options)}\`\`\``,
                    },
                ],
            });
        };

        const msg = await ctx.write({
            embeds: [createEmbed(ctx.options, ctx.message!)],
        });

        if (!msg) return;

        const watcher = createWatcher<typeof options>(
            {
                client: ctx.client,
                command: ctx.command,
                message: ctx.message,
                prefix: "y",
                shardId: ctx.shardId,
            },
            { idle: 10_000 },
        );

        watcher.onChange((options, rawMsg) => {
            msg.edit({ embeds: [createEmbed(options, rawMsg)] });
        });

        watcher.onStop((reason) => {
            ctx.write({ content: `watcher muerto, "${reason}"` });
        });
    }

    async onOptionsError(context: CommandContext<typeof options>) {
        await context.editOrReply({
            content: "You need to use two options",
        });
    }
}
