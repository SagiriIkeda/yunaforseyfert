import { Command, type CommandContext, Declare, Embed, Options, createStringOption, createUserOption } from "seyfert";

const options = {
    user: createUserOption({
        description: "user",
    }),
    message: createStringOption({
        description: "msg",
    }),
};
@Declare({
    name: "avatar",
    description: "Show avatar of an user",
})
@Options(options)
export default class AvatarCommand extends Command {
    async run(ctx: CommandContext<typeof options>) {
        const { user = ctx.member, message = "penguin day" } = ctx.options;

        await ctx.write({
            embeds: [
                new Embed()
                    .setTitle(`Avatar of ${user!.globalName}`)
                    .setDescription(message)
                    .setImage(user!.avatarURL({ size: 1024, extension: "png" })),
            ],
        });
    }
}
