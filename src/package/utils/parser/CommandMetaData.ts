import { ApplicationCommandOptionType } from "discord-api-types/v10";
import type { Command, CommandOption, SeyfertNumberOption, SeyfertStringOption, SubCommand } from "seyfert";
import { type Instantiable, type YunaUsableCommand, keyConfig } from "../../things";
import { type CommandOptionWithType, type YunaParserCreateOptions, createRegexes, mergeConfig } from "./createConfig";

const InvalidOptionType = new Set([
    ApplicationCommandOptionType.Attachment,
    ApplicationCommandOptionType.Subcommand,
    ApplicationCommandOptionType.SubcommandGroup,
]);

type DecoredChoice = [rawName: string, name: string, value: string | number];

export class YunaParserCommandMetaData {
    command: YunaUsableCommand;
    iterableOptions?: CommandOption[];
    regexes?: ReturnType<typeof createRegexes>;

    config?: YunaParserCreateOptions;

    globalConfig: YunaParserCreateOptions;

    choices?: [optionName: string, choices: DecoredChoice[]][];

    base: Instantiable<Command | SubCommand>;

    options = new Map<string, CommandOptionWithType>();

    constructor(command: YunaUsableCommand, globalConfig: YunaParserCreateOptions) {
        this.command = command;
        this.globalConfig = globalConfig;
        this.config = this.command[keyConfig];

        this.base = Object.getPrototypeOf(command);

        this.iterableOptions = command.options?.filter((option) => "type" in option && !InvalidOptionType.has(option.type));

        if (this.iterableOptions?.length) {
            const choices: typeof this.choices = [];

            type OptionType = (SeyfertStringOption | SeyfertNumberOption) & CommandOptionWithType;

            for (const option of this.iterableOptions as OptionType[]) {
                this.options.set(option.name, option);

                if (!option.choices?.length) continue;

                choices.push([
                    option.name,
                    option.choices.map(({ name, value }) => [name, name.toLowerCase(), value.toString().toLowerCase()]),
                ]);
            }

            if (choices.length) this.choices = choices;
        }

        if (this.config) this.regexes = createRegexes(this.getConfig());
    }

    getConfig() {
        const { config } = this;
        if (!config) return this.globalConfig;

        return mergeConfig(this.globalConfig, config);
    }
}
