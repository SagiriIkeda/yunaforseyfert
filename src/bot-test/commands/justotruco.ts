import { Command, type CommandContext, Declare, createAttachmentOption, createStringOption } from "seyfert";

const options = {
    engine: createStringOption({
        description: "Select the engine.",
        required: true,
        choices: [
            {
                name: "Spotify",
                value: "spsearch",
            },
            {
                name: "Youtube",
                value: "ytsearch",
            },
            {
                name: "Youtube Music",
                value: "ytmsearch",
            },
            {
                name: "Soundcloud",
                value: "scsearch",
            },
        ] as const,
    }),
    attch: createAttachmentOption({
        description: "attachment",
        required: true,
    }),
};

@Declare({
    name: "ping",
    description: "Show the ping with discord",
})
export default class JustotrucoCommand extends Command {
    async run(ctx: CommandContext<typeof options>) {
        const { engine, attch } = ctx.options;

        await ctx.write({
            content: `The engine is \`${engine}\` and the attachment is ${attch}`,
        });
    }
}
