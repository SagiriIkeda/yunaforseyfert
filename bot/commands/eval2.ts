import { Command, type CommandContext, createBooleanOption, createStringOption, Declare, Embed, Options } from "seyfert";
import { DeclareParserConfig, ParserRecommendedConfig, Yuna } from "../../src";
import { codeBlock } from "./eval";

const options = {
    code: createStringOption({
        description: "code",
        required: true,
    }),
    async: createBooleanOption({
        description: "async",
        flag: true,
    }),
};

const config = Yuna.mergeParserConfig(ParserRecommendedConfig.Eval, {
    useNamedWithSingleValue: true,
});

@Declare({
    name: "eval2",
    description: "run code",
})

@Options(options)
@DeclareParserConfig(config)
export default class Eval2Command extends Command {
    override async run(ctx: CommandContext<typeof options>) {
        const { code } = ctx.options;

        await ctx.write({
            embeds: [
                new Embed().setTitle("Test Eval").addFields([
                    {
                        name: "isAsync",
                        value: codeBlock("", String(ctx.options.async)),
                    },
                    {
                        name: "Code",
                        value: codeBlock("", code!),
                    },
                ]),
            ],
        });
    }
}
