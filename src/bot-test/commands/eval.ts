/**
 * @Justo take my code and I'll take his
 */

import { inspect } from "node:util";
import { Command, type CommandContext, Declare, Embed, Options, createStringOption } from "seyfert";
import { EmbedColors } from "seyfert/lib/common/index.js";
import { ParserRecommendedConfig } from "../../package";
import { DeclareParserConfig } from "../../package/utils/parser/createConfig";

export const codeBlock = (language: string, code: string) => `\`\`\`${language}\n${code}\n\`\`\``;
export const getDepth = (error: any): string => inspect(error, { depth: 0 });
export const sliceText = (text: string, max: number = 100) => (text.length > max ? `${text.slice(0, max)}...` : text);

const evalOptions = {
    code: createStringOption({
        description: "Enter the code to be evaluated.",
        required: true,
    }),
};

@Declare({
    name: "eval",
    description: "Evaluate a javascript code.",
})
@Options(evalOptions)
@DeclareParserConfig(ParserRecommendedConfig.Eval)
export default class EvalCommand extends Command {
    async run(ctx: CommandContext<typeof evalOptions>) {
        if (ctx.author.id !== "388415190225518602") return ctx.write({ content: "you can't use this." });

        const { options, client, guildId, channelId, member, author } = ctx;
        const { code } = options;

        if (!(guildId && member)) return;

        const timeStart = Date.now();

        await member.fetch();

        let output: string | null = null;
        let asyncCode: string = code;

        await client.channels.typing(channelId);

        if (!code.length)
            return ctx.write({
                embeds: [
                    {
                        description: "🐧 Hey! Try typing some code to be evaluated...",
                        color: EmbedColors.Red,
                    },
                ],
            });

        const embed = new Embed().setAuthor({ name: author.tag, iconUrl: author.avatarURL() }).setTimestamp();

        try {
            if (/^(?:\(?)\s*await\b/.test(code.toLowerCase())) asyncCode = `(async () => ${code})()`;

            output = await eval(asyncCode);
            output = getDepth(output);

            const timeExec = Date.now() - timeStart;

            embed
                .setColor("Aqua")
                .setDescription(`🐧 A code has been evaluated.\n \n${codeBlock("js", sliceText(output, 1900))}`)
                .addFields(
                    {
                        name: "🐧 Type",
                        value: `${codeBlock("js", typeof output)}`,
                        inline: true,
                    },
                    {
                        name: "🐧 Evaluated",
                        value: `\`${Math.floor(timeExec)}ms\``,
                        inline: true,
                    },
                    { name: "🐧 Input", value: sliceText(codeBlock("js", code), 1024) },
                );

            await ctx.write({ embeds: [embed] }).catch(() => {});
        } catch (error) {
            const timeExec = Date.now() - timeStart;

            embed
                .setColor("Red")
                .setDescription("🐧 An error occurred while trying to evaluate.")
                .addFields(
                    {
                        name: "🐧 Type",
                        value: `${codeBlock("js", typeof output)}`,
                        inline: true,
                    },
                    {
                        name: "🐧 Evaluated",
                        value: `\`${Math.floor(timeExec)}ms\``,
                        inline: true,
                    },
                    { name: "🐧 Input", value: sliceText(codeBlock("js", code), 1024) },
                    {
                        name: "🐧 Output",
                        value: `${codeBlock("js", sliceText(`${error}`, 1900))}`,
                    },
                );

            await ctx.write({ embeds: [embed] }).catch(() => {});
        }
    }
}
