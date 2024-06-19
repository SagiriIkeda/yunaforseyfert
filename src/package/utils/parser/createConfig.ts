import type { ApplicationCommandOptionType } from "discord-api-types/v10";
import type { CommandOption } from "seyfert";
import { type YunaUsableCommand, keyConfig, keyMetadata } from "../../things";
import { YunaParserCommandMetaData } from "./CommandMetaData";

type ValidLongTextTags = "'" | '"' | "`";
type ValidNamedOptionSyntax = "-" | "--" | ":";
export type CommandOptionWithType = CommandOption & { type: ApplicationCommandOptionType };

export interface YunaParserCreateOptions {
    /**
     * this only show console.log with the options parsed.
     * @defaulst false */
    logResult?: boolean;

    /** syntaxes enabled */

    syntax?: {
        /** especify what longText tags you want
         *
         * ` " ` => `"penguin life"`
         *
         * ` ' ` => `'beautiful sentence'`
         *
         * **&#96;** => **\`Eve『Insomnia』 is a good song\`**
         *
         * @default 🐧 all enabled
         */
        longTextTags?: [ValidLongTextTags?, ValidLongTextTags?, ValidLongTextTags?];
        /** especify what named syntax you want
         *
         * ` - ` -option content value
         *
         * ` -- ` --option content value
         *
         * ` : ` option: content value
         *
         * @default 🐧 all enabled
         */
        namedOptions?: [ValidNamedOptionSyntax?, ValidNamedOptionSyntax?, ValidNamedOptionSyntax?];
    };

    /**
     * Turning it on can be useful for when once all the options are obtained,
     * the last one can take all the remaining content, ignoring any other syntax.
     * @default {false}
     */
    breakSearchOnConsumeAllOptions?: boolean;

    /**
     * Limit that you can't use named syntax "-" and ":" at the same time,
     * but only the first one used, sometimes it's useful to avoid confusion.
     * @default {false}
     */
    useUniqueNamedSyntaxAtSameTime?: boolean;

    /**
     * This disables the use of longTextTags in the last option
     * @default {false}
     */
    disableLongTextTagsInLastOption?: boolean;

    /** Use Yuna's choice resolver instead of the default one, put null if you don't want it,
     *
     * YunaChoiceResolver allows you to search through choices regardless of case or lowercase,
     * as well as allowing direct use of an choice's value,
     * and not being forced to use only the name.
     *
     * @default enabled
     */
    resolveCommandOptionsChoices?: {
        /** Allow you to use the value of a choice directly, not necessarily search by name
         * @default {true}
         */
        canUseDirectlyValue?: boolean;
    } | null;

    /** If the first option is of the 'User' type,
     *  it can be taken as the user to whom the message is replying.
     *  @default {null} (not enabled)
     */
    useRepliedUserAsAnOption?: {
        /** need to have the mention enabled (@PING) */
        requirePing: boolean;
    } | null;
}

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

export const createRegexes = ({ syntax: enabled }: YunaParserCreateOptions) => {
    const hasAnyLongTextTag = (enabled?.longTextTags?.length ?? 0) >= 1;
    const hasAnyNamedSyntax = (enabled?.namedOptions?.length ?? 0) >= 1;

    const hasAnyEspecialSyntax = hasAnyNamedSyntax || hasAnyLongTextTag;

    const backescape = hasAnyEspecialSyntax ? "\\\\" : "";

    const escapeModes: EscapeModeType = {};

    const syntaxes: string[] = [];

    const has1HaphenSyntax = enabled?.namedOptions?.includes("-");
    const has2HaphenSyntax = enabled?.namedOptions?.includes("--");
    const hasDottedSyntax = enabled?.namedOptions?.includes(":");

    const escapedLongTextTags =
        enabled?.longTextTags
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
            [keyConfig] = createConfig(config, false);
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

    if (isFull || "breakSearchOnConsumeAllOptions" in config)
        newConfig.breakSearchOnConsumeAllOptions = config.breakSearchOnConsumeAllOptions === true;
    if (isFull || "useUniqueNamedSyntaxAtSameTime" in config)
        newConfig.useUniqueNamedSyntaxAtSameTime = config.useUniqueNamedSyntaxAtSameTime === true;
    if (isFull || "logResult" in config) newConfig.logResult = config.logResult === true;
    if (isFull || "disableLongTextTagsInLastOption" in config)
        newConfig.disableLongTextTagsInLastOption = config.disableLongTextTagsInLastOption === true;
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

export const getYunaMetaDataFromCommand = (command: YunaUsableCommand, config: YunaParserCreateOptions) => {
    const InCommandMetadata = command[keyMetadata];

    const base = Object.getPrototypeOf(command);

    if (InCommandMetadata && InCommandMetadata?.base === base) return InCommandMetadata;

    const metadata = new YunaParserCommandMetaData(command, config);

    command[keyMetadata] = metadata;

    return metadata;
};
