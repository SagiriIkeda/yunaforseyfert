import { inspect } from "node:util";
import { Command, type CommandContext, Declare, Embed, Options, createStringOption } from "seyfert";
import { Yuna } from "../../package/index.js";
import { Watch } from "../../package/utils/messageWatcher/decorator";

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
    @Watch({
        idle: 10_000,
        onStop(reason) {
            this.ctx?.editOrReply({ content: `watcher end '${reason}'`, embeds: [] });
        },
        beforeCreate(ctx) {
            const userWatcher = Yuna.watchers.findInstances(ctx.client, {
                userId: ctx.author.id,
                command: this,
            });

            if (!userWatcher) return;

            const [watcher] = userWatcher.instances;

            watcher?.stopAll("AnotherInstanceCreated");
        },
    })
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
                    value: `\`\`\`js\n${inspect(ctx.options)}\`\`\``,
                },
            ],
        });

        await ctx.editOrReply({
            embeds: [embed],
        });
    }
    async onOptionsError(context: CommandContext<typeof options>) {
        await context.editOrReply({
            content: "You need to use two options",
        });
    }
}
