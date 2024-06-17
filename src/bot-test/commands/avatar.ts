import { Command, type CommandContext, Declare, Embed, Options, createUserOption } from "seyfert";

const options = {
    user: createUserOption({
        description: "user",
        required: true,
    }),
};
@Declare({
    name: "avatar",
    description: "Show avatar of an user",
})
@Options(options)
export default class AvatarCommand extends Command {
    async run(ctx: CommandContext<typeof options>) {
        const { user } = ctx.options;

        await ctx.write({
            embeds: [new Embed().setImage(user.avatarURL({ size: 1024, extension: "png" }))],
        });
    }
}
