import type { CommandOption, SeyfertNumberOption, SeyfertStringOption } from "seyfert";
import { ApplicationCommandOptionType } from "seyfert/lib/types";
import { Keys, type YunaUsable } from "../../things";
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
    readonly command: YunaUsable;

    readonly iterableOptions: CommandOption[] = [];

    regexes?: ReturnType<typeof createRegexes>;

    globalConfig?: YunaParserCreateOptions;

    readonly choices?: [optionName: string, choices: DecoredChoice[]][];

    base: Function;

    options = new Map<string, CommandOptionWithType>();

    readonly baseConfig?: YunaParserCreateOptions;

    /** ValidNamedOptionSyntaxes */
    vns?: ValidNamedOptionSyntaxes;

    constructor(command: YunaUsable) {
        this.command = command;

        this.base = command.constructor;

        this.baseConfig = command[Keys.parserConfig];

        if (command.options?.length) {
            const choices: typeof this.choices = [];
            type OptionType = (SeyfertStringOption | SeyfertNumberOption) & CommandOptionWithType;

            for (const option of command.options as OptionType[]) {
                if (InvalidOptionType.has(option.type)) continue;

                this.iterableOptions.push(option);
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

    static from(command: YunaUsable) {
        const InCommandMetadata = command[Keys.parserMetadata];

        const base = command.constructor;

        if (InCommandMetadata && InCommandMetadata?.base === base) return InCommandMetadata;

        const metadata = new YunaParserCommandMetaData(command);

        command[Keys.parserMetadata] = metadata;

        return metadata;
    }

    static getValidNamedOptionSyntaxes(config: YunaParserCreateOptions): ValidNamedOptionSyntaxes {
        return Object.fromEntries(config.syntax?.namedOptions?.map((t) => [t, true]) ?? []);
    }
}
