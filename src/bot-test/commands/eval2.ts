import { Command, type CommandContext, Declare, Embed, Options, createBooleanOption, createStringOption } from "seyfert";
import { DeclareParserConfig, ParserRecommendedConfig, Yuna } from "../../package";
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
export default class RunCommand extends Command {
    async run(ctx: CommandContext<typeof options>) {
        const { code } = ctx.options;

        await ctx.write({
            embeds: [
                new Embed().setTitle("Test Eval").addFields([
                    {
                        name: "isAsync",
                        value: codeBlock("", ctx.options.async ? "true" : "false"),
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
