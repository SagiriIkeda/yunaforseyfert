import { ApplicationCommandOptionType } from "discord-api-types/v10";
import { type Command, type CommandOption, SubCommand } from "seyfert";

const key = Symbol("YunaParserMetaData");

const InvalidOptionType = new Set([
    ApplicationCommandOptionType.Attachment,
    ApplicationCommandOptionType.Subcommand,
    ApplicationCommandOptionType.SubcommandGroup,
]);

const InvalidTagsToBeLong = new Set(["-", ":"]);

const evaluateBackescapes = (backspaces: string, nextChar: string) => {
    const isJustPair = backspaces.length % 2 === 0;

    const isPossiblyEscapingNext = !isJustPair && /["'`\:\-]/.test(nextChar);

    const strRepresentation = "\\".repeat(Math.floor(backspaces.length / 2)) + (isJustPair || isPossiblyEscapingNext ? "" : "\\");

    return { isPossiblyEscapingNext, strRepresentation };
};

const sanitizeBackescapes = (text: string, regx?: RegExp) =>
    regx
        ? text.replace(regx, (_, backescapes, next) => {
              const { strRepresentation } = evaluateBackescapes(backescapes, next[0]);

              return strRepresentation + next;
          })
        : text;

const spacesRegex = /[\s\x7F\n]/;

interface CommandYunaData {
    options: CommandOption[];
    depth: number;
}

const getYunaMetaDataFromCommand = (command: (Command | SubCommand) & { [key]?: CommandYunaData }) => {
    const InCache = command[key];
    if (InCache) return InCache;

    const metadata = {
        options: command.options?.filter((option) => "type" in option && !InvalidOptionType.has(option.type)) as CommandOption[],
        depth: command instanceof SubCommand ? (command.group ? 3 : 2) : 1,
    };

    command[key];

    return metadata;
};

type ValidLongTextTags = "'" | '"' | "`";
type ValidNamedOptionSyntax = "-" | "--" | ":";

interface YunaParserCreateOptions {
    /**
     * this only show console.log with the options parsed.
     * @defaulst false */
    logResult?: boolean;

    enabled?: {
        /** especify what longText tags you want
         *
         * ` " ` => `"penguin life"`
         *
         * ` ' ` => `'beautiful sentence'`
         *
         * **&#96;** => **\`LiSA『Shouted Serenade』 is a good song\`**
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
     * this can be useful is you want to no-overwrite options when using named-syntax after all args are especified.
     * Or take all content ignoring the named-syntax after all args are especified,
     * i will find a better way to explain this.
     * @default {false}
     */
    breakSearchOnConsumeAllOptions?: boolean;

    /**
     * this limit the usage of multiple syntax at same time in a sentence
     * (this no distinguish between -- and -. you can use it at same time.)
     * @default {false}
     */
    useUniqueNamedSyntaxAtSameTime?: boolean;
}

const createRegexs = ({ enabled }: YunaParserCreateOptions) => {
    const hasAnyLongTextTag = (enabled?.longTextTags?.length ?? 0) >= 1;
    const hasAnyNamedSyntax = (enabled?.namedOptions?.length ?? 0) >= 1;

    const hasAnyEspecialSyntax = hasAnyNamedSyntax || hasAnyLongTextTag;

    const backescape = hasAnyEspecialSyntax ? "\\\\" : "";

    const EscapeMode: Record<string, RegExp | undefined> = {};

    const syntaxes: string[] = [];

    const has1HaphenSyntax = enabled?.namedOptions?.includes("-");
    const has2HaphenSyntax = enabled?.namedOptions?.includes("--");
    const hasDottedSyntax = enabled?.namedOptions?.includes(":");

    const escapedLongTextTags =
        enabled?.longTextTags
            ?.map((tag) => {
                EscapeMode[tag!] = new RegExp(`(\\\\+)([${tag}\\s])`, "g");

                return `\\${tag}`;
            })
            .join("") ?? "";

    EscapeMode.All = new RegExp(`(\\+)([${escapedLongTextTags}\s:\\-])`);

    const RemoveNamedEscapeModeKeys = ["All", "forNamed", "forNamedDotted"];
    const RemoveNamedEscapeMode = (text: string) => {
        for (const mode of RemoveNamedEscapeModeKeys) {
            const regx = EscapeMode[mode];
            if (!regx) continue;

            const regexStr = EscapeMode[mode]!.source.replace(text, "");

            EscapeMode[mode] = new RegExp(regexStr, EscapeMode[mode]?.flags);
        }
    };

    if (hasAnyEspecialSyntax) {
        const extras: string[] = [];

        (has1HaphenSyntax || has2HaphenSyntax) && extras.push("-");
        hasDottedSyntax && extras.push(":");

        syntaxes.push(`(?<tag>[${escapedLongTextTags}${extras.join("")}])`);
    }

    syntaxes.push(`(?<value>[^\\s\\x7F${escapedLongTextTags}${backescape}]+)`);

    if (hasAnyNamedSyntax) {
        const namedSyntaxes: string[] = [];

        if (has1HaphenSyntax || has2HaphenSyntax) {
            const HaphenLength = [];

            has1HaphenSyntax && HaphenLength.push(1);
            has2HaphenSyntax && HaphenLength.push(2);

            namedSyntaxes.push(`(?<hyphens>-{${HaphenLength.join(",")}})(?<hyphensname>[a-zA-Z_\\d]+)`);
            EscapeMode.forNamed = /(\\+)([\:\s\-])/g;
        } else {
            RemoveNamedEscapeMode("\\-");
        }

        if (hasDottedSyntax) {
            namedSyntaxes.push("(?<dotsname>[a-zA-Z_\\d]+)(?<dots>:)(?!\\/\\/[^\\s\\x7F]))");
            EscapeMode.forNamedDotted = /(\\+)([\:\s\-\/])/g;
        } else {
            RemoveNamedEscapeMode(":");
        }

        namedSyntaxes.length && syntaxes.unshift(`(?<named>(\\\\*)(?:${namedSyntaxes.join("|")}))`);
    }

    if (backescape) {
        syntaxes.push("(?<backescape>\\\\+)");
    }

    return {
        ElementsRegex: RegExp(syntaxes.join("|"), "g"),
        EscapeMode,
        RemoveNamedEscapeMode,
    };
};

/**
 * @version 0.9
 * @example
 * ```js
 * import { YunaParser } from "yunaforseyfert"
 * 
 * new Client({ 
       commands: {
           argsParser: YunaParser()
       }
   });
 * ```
 */

export const YunaParser = (config: YunaParserCreateOptions = {}) => {
    config = {
        enabled: {
            longTextTags: [...new Set(config?.enabled?.longTextTags ?? ['"', "'", "`"])] as NonNullable<
                YunaParserCreateOptions["enabled"]
            >["longTextTags"],
            namedOptions: [...new Set(config?.enabled?.namedOptions ?? ["-", "--", ":"])] as NonNullable<
                YunaParserCreateOptions["enabled"]
            >["namedOptions"],
        },
        breakSearchOnConsumeAllOptions: config.breakSearchOnConsumeAllOptions === true,
        useUniqueNamedSyntaxAtSameTime: config.useUniqueNamedSyntaxAtSameTime === true,
        logResult: config.logResult === true,
    };

    const { breakSearchOnConsumeAllOptions, useUniqueNamedSyntaxAtSameTime } = config;

    const ValidNamedOptions = Object.fromEntries(config.enabled?.namedOptions?.map((syntax) => [syntax, true]) ?? []);

    const { ElementsRegex, EscapeMode, RemoveNamedEscapeMode } = createRegexs(config);

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: omitting this rule the life is better
    return (content: string, command: Command | SubCommand): Record<string, string> => {
        const { options, depth: skipElementsCount } = getYunaMetaDataFromCommand(command);

        if (!options) return {};

        const matches = content.matchAll(ElementsRegex);

        let tagOpenWith: '"' | "'" | "`" | "-" | null = null;
        let tagOpenPosition: number | null = null;
        let actualOptionIdx: number = 0;
        let isEscapingNext = false;
        let unindexedRightText = "";

        let namedOptionTagUsed: string | undefined;

        let namedOptionInitialized: {
            name: string;
            start: number;
            dotted: boolean;
        } | null = null;

        let lastestLongWord: { start: number; name: string; unindexedRightText: string } | undefined;

        let lastOptionNameAdded: string | undefined;
        let isRecentlyClosedAnyTag = false;
        let matchIdx = 0;

        const result: Record<string, string> = {};

        const aggregateNextOption = (value: string, start: number | null) => {
            if (start === null && unindexedRightText) {
                const savedUnindexedText = unindexedRightText;
                unindexedRightText = "";
                aggregateNextOption(savedUnindexedText, null);
            }

            const optionAtIndexName = options[actualOptionIdx]?.name;

            if (!optionAtIndexName) return;

            const isLastOption = actualOptionIdx === options.length - 1;

            if (isLastOption && start) {
                lastestLongWord = {
                    start,
                    name: optionAtIndexName,
                    unindexedRightText,
                };
            }

            result[optionAtIndexName] = unindexedRightText + value;
            unindexedRightText = "";

            actualOptionIdx++;

            lastOptionNameAdded = optionAtIndexName;

            return lastOptionNameAdded;
        };

        const aggregateLastestLongWord = (end: number = content.length, postText = "") => {
            if (!lastestLongWord) return;

            const { name, start, unindexedRightText } = lastestLongWord;

            lastestLongWord = undefined;

            result[name] = (unindexedRightText + sanitizeBackescapes(content.slice(start, end), EscapeMode.All) + postText).trim();
            return;
        };

        const aggregateUnindexedText = (
            textPosition: number,
            text: string,
            precedentText = "",
            realText = text,
            enableRight = true,
            isRecentlyClosedAnyTag = false,
        ) => {
            if (namedOptionInitialized) return;

            const backPosition = textPosition - (precedentText.length + 1);
            const nextPosition = textPosition + realText.length;

            const backChar = content[backPosition];
            const nextChar = content[nextPosition];

            if (
                !unindexedRightText &&
                lastOptionNameAdded &&
                !isRecentlyClosedAnyTag &&
                backChar &&
                !spacesRegex.test(backChar) /* placeIsForLeft */
            ) {
                result[lastOptionNameAdded] += text;
                return;
            }

            if (enableRight && nextChar && !spacesRegex.test(nextChar) /* placeIsForRight */) {
                unindexedRightText += text;
                return;
            }

            aggregateNextOption(text, textPosition);
        };

        const aggregateTagLongText = (tag: string, start: number, end?: number) => {
            const value = content.slice(start, end);
            tagOpenWith = null;
            tagOpenPosition = null;
            isRecentlyClosedAnyTag = true;
            const reg = EscapeMode[tag as keyof typeof EscapeMode];

            aggregateNextOption(reg ? sanitizeBackescapes(value, reg) : value, null);
        };

        const aggregateNextNamedOption = (end: number) => {
            if (!namedOptionInitialized) return;
            const { name, start, dotted } = namedOptionInitialized;

            const value = sanitizeBackescapes(content.slice(start, end).trimStart(), EscapeMode[dotted ? "forNamedDotted" : "forNamed"]);

            namedOptionInitialized = null;

            if (result[name] === undefined) actualOptionIdx++;

            result[name] = value;

            lastOptionNameAdded = name;
            return name;
        };

        for (const match of matches) {
            if (breakSearchOnConsumeAllOptions && actualOptionIdx >= options.length) break;
            if (matchIdx++ < skipElementsCount) continue;

            const _isRecentlyCosedAnyTag = isRecentlyClosedAnyTag;
            isRecentlyClosedAnyTag = false;

            const { index = 0, groups } = match;

            const { tag, value, backescape, named } = groups ?? {};

            if (named && !tagOpenWith) {
                const { hyphens, hyphensname, dots, dotsname } = groups ?? {};

                const [, , backescapes] = match;

                const tagName = hyphensname ?? dotsname;

                const tagUsed = (hyphens ?? dots)[0] as "-" | ":";

                const isValidUsedTag = ValidNamedOptions[tagUsed];

                if (isValidUsedTag && !namedOptionTagUsed) {
                    namedOptionTagUsed = tagUsed;
                    RemoveNamedEscapeMode(tagUsed === "-" ? ":" : "-");
                }

                if (!isValidUsedTag || (useUniqueNamedSyntaxAtSameTime && namedOptionTagUsed !== tagUsed)) {
                    aggregateUnindexedText(index, named, undefined, named, undefined, _isRecentlyCosedAnyTag);
                    continue;
                }

                let backescapesStrRepresentation = "";

                if (backescapes) {
                    const nextChar = named[backescapes.length];

                    const { isPossiblyEscapingNext, strRepresentation } = evaluateBackescapes(backescapes, nextChar);
                    backescapesStrRepresentation = strRepresentation;

                    if (hyphensname && isPossiblyEscapingNext) {
                        aggregateUnindexedText(
                            index,
                            strRepresentation + named.slice(backescapes.length),
                            undefined,
                            named,
                            undefined,
                            _isRecentlyCosedAnyTag,
                        );
                        continue;
                    }
                    if (!lastestLongWord && strRepresentation)
                        aggregateUnindexedText(index, strRepresentation, undefined, backescapes, false, _isRecentlyCosedAnyTag);
                }

                aggregateNextNamedOption(index - 1);

                if (lastestLongWord) aggregateLastestLongWord(index, backescapesStrRepresentation);

                namedOptionInitialized = {
                    name: tagName,
                    start: index + named.length,
                    dotted: dotsname !== undefined,
                };

                continue;
            }

            if (lastestLongWord || namedOptionInitialized) continue;

            if (backescape) {
                const { length } = backescape;

                const nextChar = content[index + length];

                const { isPossiblyEscapingNext, strRepresentation } = evaluateBackescapes(backescape, nextChar);

                if (isPossiblyEscapingNext) isEscapingNext = true;

                strRepresentation && aggregateUnindexedText(index, strRepresentation, "", backescape, undefined, _isRecentlyCosedAnyTag);
                continue;
            }

            if (tag) {
                if (isEscapingNext) {
                    isEscapingNext = false;
                    if (!tagOpenWith) {
                        aggregateUnindexedText(index, tag, "/", undefined, undefined, _isRecentlyCosedAnyTag);
                    }
                } else if (InvalidTagsToBeLong.has(tag)) {
                    aggregateUnindexedText(index, tag, "", undefined, undefined, _isRecentlyCosedAnyTag);
                    continue;
                } else if (!tagOpenWith) {
                    tagOpenWith = tag as unknown as typeof tagOpenWith;
                    tagOpenPosition = index + 1;
                } else if (tagOpenWith === tag && tagOpenPosition) {
                    aggregateTagLongText(tag, tagOpenPosition, index);
                }

                continue;
            }

            if (value && tagOpenWith === null) {
                const placeIsForLeft =
                    matchIdx > skipElementsCount && !_isRecentlyCosedAnyTag && !unindexedRightText && !spacesRegex.test(content[index - 1]);

                if (placeIsForLeft && lastOptionNameAdded) {
                    result[lastOptionNameAdded] += value;
                    continue;
                }

                const aggregated = aggregateNextOption(value, index);

                if (!aggregated) break;
            }
        }

        aggregateLastestLongWord();

        if (namedOptionInitialized) {
            aggregateNextNamedOption(content.length);
        } else if (tagOpenPosition && tagOpenWith) aggregateTagLongText(tagOpenWith, tagOpenPosition);

        config.logResult && console.log(result);

        return result;
    };
};
