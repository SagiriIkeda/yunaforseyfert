import type { CommandOption, SeyfertNumberOption, SeyfertStringOption } from "seyfert";
import { ApplicationCommandOptionType } from "seyfert/lib/types";
import { MemoizeMethod } from "../../lib/utils";
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

            type ChoiceableOption = SeyfertStringOption | SeyfertNumberOption;
            type OptionType = ChoiceableOption & CommandOptionWithType & ExtendedOption;

            for (const option of command.options as OptionType[]) {
                if (InvalidOptionType.has(option.type)) continue;

                if (option.flag) this.flagOptions.set(option.name, option);
                else this.iterableOptions.push(option);

                this.options.set(option.name, option);

                if (!option.choices?.length) continue;

                choices.push([
                    option.name,
                    (<ChoiceableOption>option).choices!.map(({ name, value }) => [
                        name,
                        name.toLowerCase(),
                        value.toString().toLowerCase(),
                    ]),
                ]);
            }

            if (choices.length) this.choices = choices;
        }
    }

    static optionTypes = {
        integerAndNumber: Symbol("Numeric"),
        userAndMentionable: Symbol("userAndMentionable"),
        roleAndMentionable: Symbol("roleAndMentionable"),
        channelAndMentionable: Symbol("channelAndMentionable"),
        userRoleChannelMentionable: Symbol("userRoleChannelMentionable"),
    };

    @MemoizeMethod
    getIsortOptions() {
        const optionsByTypes = new Map<number | symbol, CommandOption[]>();

        const pushToType = (type: number | symbol, option: CommandOption) => {
            const array = optionsByTypes.get(type) ?? [];
            array.push(option);
            optionsByTypes.set(type, array);
        };

        for (const option of this.iterableOptions as CommandOptionWithType[]) {
            pushToType(option.type, option);

            if (option.type === ApplicationCommandOptionType.Integer || option.type === ApplicationCommandOptionType.Number) {
                pushToType(YunaParserCommandMetaData.optionTypes.integerAndNumber, option);
            } else if (option.type === ApplicationCommandOptionType.User) {
                pushToType(YunaParserCommandMetaData.optionTypes.userAndMentionable, option);
                pushToType(YunaParserCommandMetaData.optionTypes.userRoleChannelMentionable, option);
            } else if (option.type === ApplicationCommandOptionType.Role) {
                pushToType(YunaParserCommandMetaData.optionTypes.roleAndMentionable, option);
                pushToType(YunaParserCommandMetaData.optionTypes.userRoleChannelMentionable, option);
            } else if (option.type === ApplicationCommandOptionType.Channel) {
                pushToType(YunaParserCommandMetaData.optionTypes.channelAndMentionable, option);
                pushToType(YunaParserCommandMetaData.optionTypes.userRoleChannelMentionable, option);
            } else if (option.type === ApplicationCommandOptionType.Mentionable) {
                pushToType(YunaParserCommandMetaData.optionTypes.userRoleChannelMentionable, option);
                pushToType(YunaParserCommandMetaData.optionTypes.userAndMentionable, option);
                pushToType(YunaParserCommandMetaData.optionTypes.roleAndMentionable, option);
                pushToType(YunaParserCommandMetaData.optionTypes.channelAndMentionable, option);
            }
        }

        return {
            optionsByTypes,
        };
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
