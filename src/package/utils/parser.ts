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

const sanitizeBackescapes = (text: string, regx: RegExp) =>
    text.replace(regx, (_, backescapes, next) => {
        const { strRepresentation } = evaluateBackescapes(backescapes, next[0]);

        return strRepresentation + next;
    });

const EscapeMode = {
    '"': /(\\+)(["\s])/g,
    "'": /(\\+)(['\s])/g,
    "`": /(\\+)([`\s])/g,
    forNamed: /(\\+)([\:\s\-])/g,
    forNamedDotted: /(\\+)([\:\s\-\/])/g,
    All: /(\\+)([`"':\s\-])/g,
} satisfies Record<string, RegExp | undefined>;

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
type ValidNamedOptionSyntax = "-" | '--' | ":";

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
        namedOptions?: [ValidNamedOptionSyntax?, ValidNamedOptionSyntax?, ValidNamedOptionSyntax?]
    }

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

const createElementsRegex = ({ enabled }: YunaParserCreateOptions) => {

    let regexString = "(?<tag>[\"'`:-])|(?<value>[^\\s\\x7F\"'`\\\\]+)|(?<backescape>\\\\+)";

    const isOneOfNamedOptionsSyntaxEnabled = (enabled?.namedOptions?.length ?? 0) >= 1;

    if (isOneOfNamedOptionsSyntaxEnabled) {
        regexString = `(?<named>(\\\\*)(?:(-{1,2})([a-zA-Z_\\d]+)|([a-zA-Z_\\d]+)(:)(?!\\/\\/[^\\s\\x7F])))|${regexString}`;
    }

    return RegExp(regexString, "g");
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
            longTextTags: config?.enabled?.longTextTags ?? ['"', "'", "`"],
            namedOptions: config?.enabled?.namedOptions ?? ["-", "--", ":"]
        },
        breakSearchOnConsumeAllOptions: config.breakSearchOnConsumeAllOptions === true,
        useUniqueNamedSyntaxAtSameTime: config.useUniqueNamedSyntaxAtSameTime === true,
    };

    const {breakSearchOnConsumeAllOptions, useUniqueNamedSyntaxAtSameTime} = config;

    const ValidNamedOptions = Object.fromEntries(config.enabled?.namedOptions?.map(syntax => [syntax, true]) ?? []);

    const ElementsRegex = createElementsRegex(config);

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
            if(breakSearchOnConsumeAllOptions && actualOptionIdx >= options.length) break;
            if (matchIdx++ < skipElementsCount) continue;

            const _isRecentlyCosedAnyTag = isRecentlyClosedAnyTag;
            isRecentlyClosedAnyTag = false;

            const { index = 0, groups } = match;

            const { tag, value, backescape, named } = groups ?? {};

            if (named && !tagOpenWith) {
                const [, , backescapes, __, namefor_, nameforDotted, dots] = match;

                const tagName = namefor_ ?? nameforDotted;

                const tagUsed = (__ ?? dots)[0] as "-" | "--" | ":";

                const isValidUsedTag = ValidNamedOptions[tagUsed];

                if (isValidUsedTag) namedOptionTagUsed ??= tagUsed;

                if (!isValidUsedTag || (useUniqueNamedSyntaxAtSameTime && namedOptionTagUsed !== tagUsed)) {
                    aggregateUnindexedText(index, named, undefined, named, undefined, _isRecentlyCosedAnyTag);
                    continue;
                }

                let backescapesStrRepresentation = "";

                if (backescapes) {
                    const nextChar = named[backescapes.length];

                    const { isPossiblyEscapingNext, strRepresentation } = evaluateBackescapes(backescapes, nextChar);
                    backescapesStrRepresentation = strRepresentation;

                    if (namefor_ && isPossiblyEscapingNext) {
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
                    dotted: nameforDotted !== undefined,
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
