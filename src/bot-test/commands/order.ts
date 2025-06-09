import { Command, type CommandContext, Declare, Embed, Options, createNumberOption, createStringOption } from "seyfert";

const options = {
    text: createStringOption({
        description: "What to say",
        required: true,
    }),
    time: createNumberOption({
        description: "What time",
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
        const { text } = ctx.options;

        await ctx.editOrReply({ embeds: [this.embed(text)] });
    }

    embed(text: string, endReason?: string) {
        const embed = new Embed().setColor("Purple").setDescription(text);

        if (endReason) embed.data.description += `\n\n*Watcher ended by **\`${endReason}\`***`;

        return embed;
    }
}
