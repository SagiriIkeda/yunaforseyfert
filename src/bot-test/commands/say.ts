import { Command, type CommandContext, Declare, Embed, Options, createStringOption } from "seyfert";
import { Watch } from "../../package";

const options = {
    text: createStringOption({
        description: "What to say",
        required: true,
    }),
};

@Declare({
    name: "say",
    description: "Say something",
})
@Options(options)
export default class SayCommand extends Command {
    @Watch({
        idle: 10_000, //10 seconds
        beforeCreate(ctx) {
            // end old watcher
            const oldWatcher = Watch.find(ctx.client, { command: this, user: ctx.author.id });
            return oldWatcher?.stop("New execution");
        },
        onStop(reason) {
            const { command, ctx } = this;
            if (!ctx?.messageResponse) return;
            const { text } = this.context; // get the text from the context

            ctx?.editOrReply({ embeds: [command.embed(text, reason)] }); // edit the message with end reason
        },
        async onMessageResponseDelete(message) {
            if (!this.ctx) return;
            this.refreshTimers();

            await this.ctx.write({ content: `Message response deleted ${message.channelId}.${message.id}` });

            this.watchMessageResponseDelete(this.ctx.messageResponse!);
        },
    })
    async run(ctx: CommandContext<typeof options>) {
        const { text } = ctx.options;

        await ctx.editOrReply({ embeds: [this.embed(text)] });

        return Watch.context({ text }); // save actual text in context to reuse it in the onStop event
    }

    embed(text: string, endReason?: string) {
        const embed = new Embed().setColor("Purple").setDescription(text);

        if (endReason) embed.data.description += `\n\n*Watcher ended by **\`${endReason}\`***`;

        return embed;
    }
}
