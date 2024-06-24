import { ApplicationCommandOptionType } from "discord-api-types/v10";
import type { CommandOption, SeyfertNumberOption, SeyfertStringOption } from "seyfert";
import { type YunaUsable, keyConfig } from "../../things";
import { type CommandOptionWithType, type YunaParserCreateOptions, createRegexes, mergeConfig } from "./createConfig";

const InvalidOptionType = new Set([
    ApplicationCommandOptionType.Attachment,
    ApplicationCommandOptionType.Subcommand,
    ApplicationCommandOptionType.SubcommandGroup,
]);

type DecoredChoice = [rawName: string, name: string, value: string | number];

export class YunaParserCommandMetaData {
    command: YunaUsable;
    iterableOptions: CommandOption[] = [];

    regexes?: ReturnType<typeof createRegexes>;

    config?: YunaParserCreateOptions;

    globalConfig?: YunaParserCreateOptions;

    choices?: [optionName: string, choices: DecoredChoice[]][];

    base: Function;

    options = new Map<string, CommandOptionWithType>();

    constructor(command: YunaUsable) {
        this.command = command;
        this.config = this.command[keyConfig];

        this.base = command.constructor;

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

    getConfig(globalConfig: YunaParserCreateOptions) {
        const config = this.config ? mergeConfig(globalConfig, this.config) : globalConfig;

        if (this.globalConfig === globalConfig || !this.config) return config;

        this.globalConfig = globalConfig;

        this.regexes = this.config?.syntax && createRegexes(config);

        return config;
    }
}
