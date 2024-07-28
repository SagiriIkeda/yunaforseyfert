import { Keys } from "../../things";
import type { YunaParserCreateOptions } from "./configTypes";

type EscapeModeType = Record<string, RegExp | undefined>;

const RemoveNamedEscapeModeKeys = ["All", "forNamed", "forNamedDotted"];

export const RemoveFromCheckNextChar = (regex: RegExp, char: "\\-" | ":") => {
    return new RegExp(regex.source.replace(char, ""), regex.flags);
};

export const RemoveNamedEscapeMode = (EscapeMode: EscapeModeType, char: "\\-" | ":") => {
    for (const mode of RemoveNamedEscapeModeKeys) {
        const regx = EscapeMode[mode];
        if (!regx) continue;

        const regexStr = regx.source.replace(char, "");

        EscapeMode[mode] = new RegExp(regexStr, EscapeMode[mode]?.flags);
    }

    return EscapeMode;
};
export const RemoveLongCharEscapeMode = (EscapeMode: EscapeModeType) => {
    const regx = EscapeMode.All;
    if (!regx) return;

    const regexStr = regx.source.replace(/\\"|\\'|\\`/g, "");

    EscapeMode.All = new RegExp(regexStr, EscapeMode.All?.flags);

    return EscapeMode;
};

export const createRegexes = ({ syntax }: YunaParserCreateOptions) => {
    const hasAnyLongTextTag = (syntax?.longTextTags?.length ?? 0) >= 1;
    const hasAnyNamedSyntax = (syntax?.namedOptions?.length ?? 0) >= 1;

    const hasAnyEspecialSyntax = hasAnyNamedSyntax || hasAnyLongTextTag;

    const backescape = hasAnyEspecialSyntax ? "\\\\" : "";

    const escapeModes: EscapeModeType = {};

    const syntaxes: string[] = [];

    const has1HaphenSyntax = syntax?.namedOptions?.includes("-");
    const has2HaphenSyntax = syntax?.namedOptions?.includes("--");
    const hasDottedSyntax = syntax?.namedOptions?.includes(":");

    const escapedLongTextTags =
        syntax?.longTextTags
            ?.map((tag) => {
                escapeModes[tag!] = new RegExp(`(\\\\+)([${tag}\\s]|$)`, "g");

                return `\\${tag}`;
            })
            .join("") ?? "";

    let checkNextChar: RegExp | undefined = undefined;

    if (hasAnyEspecialSyntax) {
        const extras: string[] = [];

        (has1HaphenSyntax || has2HaphenSyntax) && extras.push("\\-");
        hasDottedSyntax && extras.push(":");

        const render = `${escapedLongTextTags}${extras.join("")}`;

        escapeModes.All = new RegExp(`(\\\\+)([${render}\\s]|$)`);

        checkNextChar = new RegExp(`[${render}\\s]|$`);

        syntaxes.push(`(?<tag>[${render}])`);
    }

    syntaxes.push(`(?<value>[^\\s\\x7F${escapedLongTextTags}${backescape}]+)`);

    if (hasAnyNamedSyntax) {
        const namedSyntaxes: string[] = [];

        if (has1HaphenSyntax || has2HaphenSyntax) {
            const HaphenLength = [];

            has1HaphenSyntax && HaphenLength.push(1);
            has2HaphenSyntax && HaphenLength.push(2);

            namedSyntaxes.push(`(?<hyphens>-{${HaphenLength.join(",")}})(?<hyphensname>[a-zA-Z_\\d]+)`);
            escapeModes.forNamed = /(\\+)([\:\s\-]|$)/g;
        } else {
            RemoveNamedEscapeMode(escapeModes, "\\-");
        }

        if (hasDottedSyntax) {
            namedSyntaxes.push("(?<dotsname>[a-zA-Z_\\d]+)(?<dots>:)(?!\\/\\/[^\\s\\x7F])");
            escapeModes.forNamedDotted = /(\\+)([\:\s\-\/]|$)/g;
        } else {
            RemoveNamedEscapeMode(escapeModes, ":");
        }

        namedSyntaxes.length && syntaxes.unshift(`(?<named>(\\\\*)(?:${namedSyntaxes.join("|")}))`);
    }

    if (backescape) {
        syntaxes.push("(?<backescape>\\\\+)");
    }

    return {
        elementsRegex: RegExp(syntaxes.join("|"), "g"),
        escapeModes: escapeModes,
        checkNextChar,
    };
};

const removeDuplicates = <A>(arr: A extends Array<infer R> ? R[] : never[]): A => {
    return [...new Set(arr)] as A;
};

export function DeclareParserConfig(config: YunaParserCreateOptions = {}) {
    return <T extends { new (...args: any[]): {} }>(target: T) => {
        if (!Object.keys(config).length) return target;
        return class extends target {
            [Keys.parserConfig] = createConfig(config, false);
        };
    };
}

export const createConfig = (config: YunaParserCreateOptions, isFull = true) => {
    const newConfig: YunaParserCreateOptions = {};

    if (isFull || (config.syntax && (config.syntax.longTextTags || config.syntax.namedOptions))) {
        newConfig.syntax ??= {};

        if (isFull || config?.syntax?.longTextTags)
            newConfig.syntax.longTextTags = removeDuplicates(config?.syntax?.longTextTags ?? ['"', "'", "`"]);
        if (isFull || config?.syntax?.namedOptions)
            newConfig.syntax.namedOptions = removeDuplicates(config?.syntax?.namedOptions ?? ["-", "--", ":"]);
    }

    if (isFull || "useCodeBlockLangAsAnOption" in config) newConfig.useCodeBlockLangAsAnOption = config.useCodeBlockLangAsAnOption === true;
    if (isFull || "breakSearchOnConsumeAllOptions" in config)
        newConfig.breakSearchOnConsumeAllOptions = config.breakSearchOnConsumeAllOptions === true;
    if (isFull || "useUniqueNamedSyntaxAtSameTime" in config)
        newConfig.useUniqueNamedSyntaxAtSameTime = config.useUniqueNamedSyntaxAtSameTime === true;
    if (isFull || "logResult" in config) newConfig.logResult = config.logResult === true;
    if (isFull || "disableLongTextTagsInLastOption" in config)
        newConfig.disableLongTextTagsInLastOption =
            config.disableLongTextTagsInLastOption === undefined
                ? false
                : typeof config.disableLongTextTagsInLastOption === "boolean"
                  ? config.disableLongTextTagsInLastOption
                  : {
                        excludeCodeBlocks: config.disableLongTextTagsInLastOption?.excludeCodeBlocks === true,
                    };

    if (isFull || "resolveCommandOptionsChoices" in config)
        newConfig.resolveCommandOptionsChoices =
            config.resolveCommandOptionsChoices === null
                ? null
                : {
                      canUseDirectlyValue: !(config.resolveCommandOptionsChoices?.canUseDirectlyValue === false),
                  };
    if (isFull || "useRepliedUserAsAnOption" in config)
        newConfig.useRepliedUserAsAnOption =
            config.useRepliedUserAsAnOption === null
                ? null
                : {
                      requirePing: config.useRepliedUserAsAnOption?.requirePing === true,
                  };

    return newConfig;
};

export const mergeConfig = (c1: YunaParserCreateOptions, c2: YunaParserCreateOptions) => {
    const result: YunaParserCreateOptions = { ...c1, ...c2 };

    if (c2.syntax) {
        result.syntax = { ...(c1.syntax ?? {}), ...c2.syntax };
    }
    if (c2.resolveCommandOptionsChoices !== undefined) {
        result.resolveCommandOptionsChoices =
            c2.resolveCommandOptionsChoices === null
                ? null
                : { ...(c1.resolveCommandOptionsChoices ?? {}), ...c2.resolveCommandOptionsChoices };
    }

    if (c2.useRepliedUserAsAnOption !== undefined) {
        result.useRepliedUserAsAnOption =
            c2.useRepliedUserAsAnOption === null ? null : { ...(c1.useRepliedUserAsAnOption ?? {}), ...c2.useRepliedUserAsAnOption };
    }

    return result;
};
