import type { CommandOption, SeyfertNumberOption, SeyfertStringOption } from "seyfert";
import { type YunaUsableCommand, keyMetadata } from "../../things";
import type { YunaParserCommandMetaData, YunaParserCreateOptions } from "./createConfig";

const getChoicesOptions = (commandMetadata: YunaParserCommandMetaData) => {
    const inCache = commandMetadata.choicesOptions?.decored;
    if (inCache) return inCache;

    const decored: NonNullable<YunaParserCommandMetaData["choicesOptions"]>["decored"] = {};

    for (const option of commandMetadata.options as ((SeyfertStringOption | SeyfertNumberOption) & CommandOption)[]) {
        if (!option.choices?.length) continue;

        decored[option.name] = option.choices.map(({ name, value }) => [name, name.toLowerCase(), value.toString().toLowerCase()]);
    }

    if (commandMetadata.choicesOptions) commandMetadata.choicesOptions.decored = decored;

    return decored;
};

export const YunaParserOptionsChoicesResolver = (
    command: YunaUsableCommand,
    namesOfOptionsWithChoices: string[],
    result: Record<string, string>,
    config: YunaParserCreateOptions,
) => {
    const commandMetadata = command[keyMetadata];
    if (!commandMetadata) return;

    const choiceOptions = getChoicesOptions(commandMetadata);
    if (!choiceOptions) return;

    const canUseDirectlyValue = config.resolveCommandOptionsChoices?.canUseDirectlyValue === true;

    for (const optionName of namesOfOptionsWithChoices) {
        const choices = choiceOptions?.[optionName];
        const optionValue = result[optionName];

        if (!choices || optionValue === undefined) continue;

        const finderText = optionValue.toLowerCase();

        const choiceName = choices?.find(([, name, value]) => name === finderText || (canUseDirectlyValue && value === finderText))?.[0];

        if (choiceName !== undefined) result[optionName] = choiceName;
    }
};
