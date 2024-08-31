import type { CommandOption, SeyfertNumberOption, SeyfertStringOption } from "seyfert";
import { ApplicationCommandOptionType } from "seyfert/lib/types";
import type { ExtendedOption } from "../../seyfert";
import { Keys, type YunaCommandUsable } from "../../things";
import type { CommandOptionWithType, ValidNamedOptionSyntax, YunaParserCreateOptions } from "./configTypes";
import { createRegexes, mergeConfig } from "./createConfig";

const InvalidOptionType = new Set([
    ApplicationCommandOptionType.Attachment,
    ApplicationCommandOptionType.Subcommand,
    ApplicationCommandOptionType.SubcommandGroup,
]);

type DecoredChoice = [rawName: string, name: string, value: string];

type ValidNamedOptionSyntaxes = Partial<Record<ValidNamedOptionSyntax, true>>;
export class YunaParserCommandMetaData {
    readonly command: YunaCommandUsable;

    readonly iterableOptions: CommandOption[] = [];

    readonly flagOptions: Map<string, CommandOption> = new Map();

    regexes?: ReturnType<typeof createRegexes>;

    globalConfig?: YunaParserCreateOptions;

    readonly choices?: [optionName: string, choices: DecoredChoice[]][];

    readonly options = new Map<string, CommandOptionWithType>();

    readonly baseConfig?: YunaParserCreateOptions;

    /** ValidNamedOptionSyntaxes */
    vns?: ValidNamedOptionSyntaxes;

    constructor(command: YunaCommandUsable) {
        this.command = command;

        this.baseConfig = command[Keys.parserConfig];

        if (command.options?.length) {
            const choices: typeof this.choices = [];
            type OptionType = (SeyfertStringOption | SeyfertNumberOption) & CommandOptionWithType & ExtendedOption;

            for (const option of command.options as OptionType[]) {
                if (InvalidOptionType.has(option.type)) continue;

                if (option.flag) this.flagOptions.set(option.name, option);
                else this.iterableOptions.push(option);

                this.options.set(option.name, option);

                if (!option.choices?.length) continue;

                choices.push([
                    option.name,
                    option.choices.map(({ name, value }) => [name, name.toLowerCase(), value.toString().toLowerCase()]),
                ]);
            }

            if (choices.length) this.choices = choices;
        }
    }

    #config?: YunaParserCreateOptions;

    getConfig(globalConfig: YunaParserCreateOptions) {
        if (!this.baseConfig) return globalConfig;

        if (this.globalConfig === globalConfig && this.#config) return this.#config;

        const resultConfig = mergeConfig(globalConfig, this.baseConfig);

        this.#config = resultConfig;

        this.globalConfig = globalConfig;

        this.regexes = resultConfig?.syntax && createRegexes(resultConfig);

        if (resultConfig.syntax?.namedOptions) this.vns = YunaParserCommandMetaData.getValidNamedOptionSyntaxes(resultConfig);

        return resultConfig;
    }

    static from(command: YunaCommandUsable) {
        const classPrototype = command.constructor.prototype;

        const InCommandMetadata = classPrototype[Keys.parserMetadata];

        if (InCommandMetadata) return InCommandMetadata;

        const metadata = new YunaParserCommandMetaData(command);

        classPrototype[Keys.parserMetadata] = metadata;

        return metadata;
    }

    static getValidNamedOptionSyntaxes(config: YunaParserCreateOptions): ValidNamedOptionSyntaxes {
        return Object.fromEntries(config.syntax?.namedOptions?.map((t) => [t, true]) ?? []);
    }
}
