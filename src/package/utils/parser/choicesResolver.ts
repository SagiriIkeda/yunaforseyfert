import { CommandOption, SeyfertNumberOption, SeyfertStringOption } from "seyfert";
import { CommandYunaMetaDataConfig, YunaParserUsableCommand, keyMetadata } from "./createConfig";

const getChoicesOptions = (commandMetadata: CommandYunaMetaDataConfig) => {

    if (commandMetadata.optionsWithChoicesDecored) return commandMetadata.optionsWithChoicesDecored;

    for (const option of commandMetadata.options as ((SeyfertStringOption | SeyfertNumberOption) & CommandOption)[]) {

        const { name, choices } = option;

        if (!choices?.length) continue;

        commandMetadata.optionsWithChoicesDecored ??= {}

        commandMetadata.optionsWithChoicesDecored[name] = choices.map(({ name, value }) => [name.toLowerCase(), typeof value === "string" ? value.toLowerCase() : value, name])
    }

    return commandMetadata.optionsWithChoicesDecored;

}


export const YunaParserOptionsChoicesResolver = (command: YunaParserUsableCommand, namesOfOptionsWithChoices: string[], result: Record<string, string>) => {

    const commandMetadata = command[keyMetadata];
    if (!commandMetadata) return;

    const choiceOptions = getChoicesOptions(commandMetadata);
    if (!choiceOptions) return;

    for (const optionName of namesOfOptionsWithChoices) {
        const choices = choiceOptions?.[optionName];
        const optionValue = result[optionName];
        if (!choices || optionValue === undefined) continue;

        const finderValue = optionValue.toLowerCase()

        const choiceName = choices?.find(([name, value]) => name === finderValue || value === finderValue)?.[2];

        if (choiceName) result[optionName] = choiceName;
    }
}