import type { ArgsResult } from "../../things";
import type { YunaParserCommandMetaData } from "./CommandMetaData";
import type { YunaParserCreateOptions } from "./createConfig";

export const YunaParserOptionsChoicesResolver = (
    metadata: YunaParserCommandMetaData,
    argsResult: ArgsResult,
    config: YunaParserCreateOptions,
) => {
    const { choices } = metadata;
    if (!choices) return;

    const canUseDirectlyValue = config.resolveCommandOptionsChoices?.canUseDirectlyValue === true;

    for (const [optionName, optionChoices] of choices) {
        const optionValue = argsResult[optionName];

        if (optionValue === undefined) continue;

        const finderText = optionValue.toLowerCase();

        const choiceName = optionChoices.find(
            ([, name, value]) => name === finderText || (canUseDirectlyValue && value === finderText),
        )?.[0];

        if (choiceName !== undefined) argsResult[optionName] = choiceName;
    }
};
