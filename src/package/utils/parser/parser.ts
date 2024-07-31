import type { Command, Message, SubCommand } from "seyfert";
import type { CommandOptionWithType, HandleCommand } from "seyfert/lib/commands/handle";
import { ApplicationCommandOptionType } from "seyfert/lib/types";
import type { ArgsResult } from "../../things";
import { YunaParserCommandMetaData } from "./CommandMetaData";
import { YunaParserOptionsChoicesResolver } from "./choicesResolver";
import type { ValidLongTextTags, ValidNamedOptionSyntax, YunaParserCreateOptions } from "./configTypes";
import { RemoveFromCheckNextChar, RemoveLongCharEscapeMode, RemoveNamedEscapeMode, createConfig, createRegexes } from "./createConfig";

const InvalidTagsToBeLong = new Set(["-", ":"]);

const evaluateBackescapes = (
    backspaces: string,
    nextChar: string,
    regexToCheckNextChar: RegExp | undefined,
    isDisabledLongTextTagsInLastOption?: boolean,
) => {
    const isJustPair = backspaces.length % 2 === 0;

    const isPossiblyEscapingNext =
        !isJustPair && (/["'`]/.test(nextChar) && isDisabledLongTextTagsInLastOption ? false : regexToCheckNextChar?.test(nextChar));

    const strRepresentation = "\\".repeat(Math.floor(backspaces.length / 2)) + (isJustPair || isPossiblyEscapingNext ? "" : "\\");

    return { isPossiblyEscapingNext, strRepresentation };
};

const backescapesRegex = /\\/;

const spacesRegex = /[\s\x7F\n]/;

const codeBlockQuote = "`";

export const YunaParser = (config: YunaParserCreateOptions = {}) => {
    const globalConfig = createConfig(config);
    const globalRegexes = createRegexes(globalConfig);

    const globalVNS = YunaParserCommandMetaData.getValidNamedOptionSyntaxes(globalConfig);

    const logResult = (self: HandleCommand, argsResult: ArgsResult) =>
        self.client.logger.debug("[Yuna.parser]", {
            argsResult,
        });

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: omitting this rule the life is better
    return function (this: HandleCommand, content: string, command: Command | SubCommand, message?: Message): Record<string, string> {
        const commandMetadata = YunaParserCommandMetaData.from(command);

        const { iterableOptions, flagOptions, options, choices } = commandMetadata;

        if (!iterableOptions.length) return {};

        const config = commandMetadata.getConfig(globalConfig);

        let actualIterableOptionsIdx = 0;
        let actualFlagOptionsIdx = 0;

        const argsResult: ArgsResult = {};

        const aggregateUserFromMessageReference = (() => {
            const reference = message?.referencedMessage;
            if (
                !reference ||
                (reference.author.id !== message.author.id &&
                    config.useRepliedUserAsAnOption?.requirePing &&
                    message?.mentions.users[0]?.id !== reference.author.id)
            )
                return;
            const option = iterableOptions[actualIterableOptionsIdx] as CommandOptionWithType | undefined;
            if (option?.type !== ApplicationCommandOptionType.User) return;

            argsResult[option.name] = reference.author.id;
            actualIterableOptionsIdx++;
            return true;
        })();

        if (aggregateUserFromMessageReference && actualIterableOptionsIdx >= iterableOptions.length) {
            config.logResult && logResult(this, argsResult);
            return argsResult;
        }

        const regexes = commandMetadata.regexes ?? globalRegexes;

        const { elementsRegex, escapeModes: __realEscapeModes } = regexes;

        let { checkNextChar } = regexes;

        const validNamedOptionSyntaxes = commandMetadata.vns ?? globalVNS;

        const {
            breakSearchOnConsumeAllOptions,
            useUniqueNamedSyntaxAtSameTime,
            disableLongTextTagsInLastOption,
            useCodeBlockLangAsAnOption,
        } = config;

        const localEscapeModes = { ...__realEscapeModes };

        const matches = content.matchAll(elementsRegex);

        interface LongTextTagsState {
            quote: ValidLongTextTags;
            /** start position */
            start: number;
            /** position with more left quotes */
            toStart: number;
            end?: number;
            toEnd?: number;
        }

        let longTextTagsState: LongTextTagsState | null = null;

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

        const hasBackescapes = backescapesRegex.test(content);

        const sanitizeBackescapes = (text: string, regx: RegExp | undefined, regexToCheckNextChar: RegExp | undefined) =>
            hasBackescapes && regx
                ? text.replace(regx, (_, backescapes, next) => {
                      const { strRepresentation } = evaluateBackescapes(backescapes, next[0], regexToCheckNextChar);

                      return strRepresentation + next;
                  })
                : text;

        const aggregateNextOption = (value: string, start: number | null) => {
            if (start === null && unindexedRightText) {
                const savedUnindexedText = unindexedRightText;
                unindexedRightText = "";
                aggregateNextOption(savedUnindexedText, null);
            }

            const optionAtIndexName = iterableOptions[actualIterableOptionsIdx]?.name;

            if (!optionAtIndexName) return;

            const isLastOption = actualIterableOptionsIdx === iterableOptions.length - 1;

            if (isLastOption && start !== null && !longTextTagsState) {
                lastestLongWord = {
                    start,
                    name: optionAtIndexName,
                    unindexedRightText,
                };
            }

            argsResult[optionAtIndexName] = unindexedRightText + value;
            unindexedRightText = "";

            actualIterableOptionsIdx++;

            lastOptionNameAdded = optionAtIndexName;

            return lastOptionNameAdded;
        };

        const aggregateLastestLongWord = (end: number = content.length, postText = "") => {
            if (!lastestLongWord) return;

            const { name, start, unindexedRightText } = lastestLongWord;

            lastestLongWord = undefined;

            if (disableLongTextTagsInLastOption) {
                RemoveLongCharEscapeMode(localEscapeModes);
            }

            const canUseAsLiterally = disableLongTextTagsInLastOption && breakSearchOnConsumeAllOptions && end === content.length;

            const slicedContent = content.slice(start, end);

            argsResult[name] = (
                unindexedRightText +
                (canUseAsLiterally ? slicedContent : sanitizeBackescapes(slicedContent, localEscapeModes.All, checkNextChar) + postText)
            ).trim();
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
                argsResult[lastOptionNameAdded] += text;
                return;
            }

            if (enableRight && nextChar && !spacesRegex.test(nextChar) /* placeIsForRight */) {
                unindexedRightText += text;
                return;
            }

            aggregateNextOption(text, textPosition);
        };

        const aggregateLongTextTag = (end?: number) => {
            if (!longTextTagsState) return;

            const value = content.slice(longTextTagsState.toStart, end);

            const reg = localEscapeModes[longTextTagsState.quote as keyof typeof localEscapeModes];

            longTextTagsState = null;
            isRecentlyClosedAnyTag = true;

            aggregateNextOption(reg ? sanitizeBackescapes(value, reg, checkNextChar) : value, null);
        };

        const aggregateNextNamedOption = (end: number) => {
            if (!namedOptionInitialized) return;
            const { name, start, dotted } = namedOptionInitialized;

            const escapeModeType = dotted ? "forNamedDotted" : "forNamed";
            const escapeMode = localEscapeModes[escapeModeType];

            const value = sanitizeBackescapes(content.slice(start, end), escapeMode, checkNextChar).trim();

            namedOptionInitialized = null;

            if (argsResult[name] === undefined) {
                if (flagOptions.has(name)) actualFlagOptionsIdx++;
                else actualIterableOptionsIdx++;
            }

            argsResult[name] = dotted
                ? value
                : value.trimStart()
                  ? value
                  : options.get(name)?.type === ApplicationCommandOptionType.Boolean
                    ? "true"
                    : value;

            lastOptionNameAdded = name;
            return name;
        };

        for (const match of matches) {
            if (!match.groups) break;
            if (actualIterableOptionsIdx + actualFlagOptionsIdx >= options.size && breakSearchOnConsumeAllOptions) break;

            const _isRecentlyCosedAnyTag = isRecentlyClosedAnyTag;
            isRecentlyClosedAnyTag = false;

            const { index = 0, groups } = match;

            const { tag, value, backescape, named } = groups ?? {};

            if (named && !longTextTagsState) {
                const { hyphens, hyphensname, dots, dotsname } = groups ?? {};

                const [, , backescapes] = match;

                const tagName = hyphensname ?? dotsname;
                const usedTag = (hyphens ?? dots) as ValidNamedOptionSyntax;

                const zeroTagUsed = usedTag[0] as "-" | ":";

                const isValidTag = validNamedOptionSyntaxes[usedTag] === true;

                if (isValidTag && !namedOptionTagUsed && config.useUniqueNamedSyntaxAtSameTime) {
                    namedOptionTagUsed = zeroTagUsed;
                    const tagToDisable = zeroTagUsed === "-" ? ":" : "\\-";
                    if (checkNextChar) checkNextChar = RemoveFromCheckNextChar(checkNextChar, tagToDisable);

                    RemoveNamedEscapeMode(localEscapeModes, tagToDisable);
                } else if (!isValidTag || (useUniqueNamedSyntaxAtSameTime && namedOptionTagUsed !== zeroTagUsed)) {
                    aggregateUnindexedText(index, named, undefined, named, undefined, _isRecentlyCosedAnyTag);
                    continue;
                }

                let backescapesStrRepresentation = "";

                if (backescapes) {
                    const nextChar = named[backescapes.length];

                    const { isPossiblyEscapingNext, strRepresentation } = evaluateBackescapes(backescapes, nextChar, checkNextChar);
                    backescapesStrRepresentation = strRepresentation;

                    if (hyphensname && isPossiblyEscapingNext) {
                        aggregateUnindexedText(index, strRepresentation + tagName, undefined, named, undefined, _isRecentlyCosedAnyTag);
                        continue;
                    }
                    if (!lastestLongWord && strRepresentation) {
                        aggregateUnindexedText(index, strRepresentation, undefined, backescapes, false, _isRecentlyCosedAnyTag);
                    }
                }

                aggregateNextNamedOption(index + (backescapesStrRepresentation ? backescapes.length : 0));

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
                const isDisabledLongTextTagsInLastOption =
                    disableLongTextTagsInLastOption && actualIterableOptionsIdx >= iterableOptions.length - 1;

                const { length } = backescape;

                const nextChar = content[index + length];

                const { isPossiblyEscapingNext, strRepresentation } = evaluateBackescapes(
                    backescape,
                    nextChar,
                    checkNextChar,
                    isDisabledLongTextTagsInLastOption,
                );

                if (isPossiblyEscapingNext) isEscapingNext = true;

                strRepresentation && aggregateUnindexedText(index, strRepresentation, "", backescape, undefined, _isRecentlyCosedAnyTag);
                continue;
            }

            if (tag) {
                const isInvalidTag = InvalidTagsToBeLong.has(tag);

                type DisableLongTextTagsInLastOptionObject = Exclude<
                    YunaParserCreateOptions["disableLongTextTagsInLastOption"],
                    boolean | undefined
                >;

                if (isEscapingNext) {
                    isEscapingNext = false;
                    if (!longTextTagsState) {
                        aggregateUnindexedText(index, tag, "/", undefined, undefined, _isRecentlyCosedAnyTag);
                    }
                    // isDisabledLongTextTagsInLastOption
                } else if (
                    !longTextTagsState &&
                    disableLongTextTagsInLastOption &&
                    actualIterableOptionsIdx >= iterableOptions.length - 1 &&
                    ((disableLongTextTagsInLastOption as DisableLongTextTagsInLastOptionObject).excludeCodeBlocks
                        ? !(tag === codeBlockQuote && content[index + 1] === codeBlockQuote && content[index + 2] === codeBlockQuote)
                        : true)
                ) {
                    aggregateNextOption(tag, index);
                    continue;
                } else if (isInvalidTag) {
                    aggregateUnindexedText(index, tag, "", undefined, undefined, _isRecentlyCosedAnyTag);
                    continue;
                } else if (!longTextTagsState) {
                    longTextTagsState = {
                        quote: tag as ValidLongTextTags,
                        start: index + 1,
                        toStart: index + 1,
                    };
                } else if (longTextTagsState.quote === tag && longTextTagsState.start !== undefined) {
                    // end quote

                    const isStartSequentially = longTextTagsState.toStart === index;

                    if (isStartSequentially) {
                        longTextTagsState.toStart++;
                    } else {
                        // end quote

                        const nextChar = content[index + 1];

                        const nextCharIsSameQuote = nextChar === tag;

                        const isPossiblyEndSequentially = nextCharIsSameQuote && longTextTagsState.end === undefined;

                        if (isPossiblyEndSequentially) {
                            longTextTagsState.end = index;
                            longTextTagsState.toEnd = index;
                            continue;
                        }

                        if (longTextTagsState.toEnd !== undefined && longTextTagsState.toEnd + 1 === index && nextCharIsSameQuote) {
                            longTextTagsState.toEnd++;
                        } else {
                            const isCodeBlock =
                                longTextTagsState.quote === "`" && longTextTagsState.toStart - longTextTagsState.start === 2;

                            const endPosition = longTextTagsState.end ?? index;

                            if (!isCodeBlock) {
                                aggregateLongTextTag(endPosition);
                            } else if (
                                longTextTagsState.end !== undefined &&
                                longTextTagsState.toEnd !== undefined &&
                                index - longTextTagsState.end >= 2
                            ) {
                                const codeBlockContent = content.slice(longTextTagsState.toStart, endPosition);

                                const lines = codeBlockContent.split("\n");

                                const codeBlockLangLine = lines[0];

                                const hasCodeBlockLang =
                                    lines.length > 1 && !/^\s|\s\n?$/.test(codeBlockLangLine) && codeBlockLangLine !== "";

                                if (hasCodeBlockLang) {
                                    useCodeBlockLangAsAnOption && aggregateNextOption(codeBlockLangLine, longTextTagsState.toStart);
                                    longTextTagsState.toStart += codeBlockLangLine.length;
                                } else {
                                    useCodeBlockLangAsAnOption && actualIterableOptionsIdx++;
                                }

                                const startsWithLineBreak = content[longTextTagsState.toStart] === "\n";
                                const endWithLineBreak = content[longTextTagsState.end - 1] === "\n";

                                if (startsWithLineBreak) longTextTagsState.toStart++;
                                if (endWithLineBreak) longTextTagsState.end--;

                                aggregateLongTextTag(longTextTagsState.end ?? index);
                            }
                        }
                    }
                }

                continue;
            }

            if (value && longTextTagsState === null) {
                const placeIsForLeft = !(_isRecentlyCosedAnyTag || unindexedRightText || spacesRegex.test(content[index - 1]));

                if (placeIsForLeft && lastOptionNameAdded) {
                    argsResult[lastOptionNameAdded] += value;
                    continue;
                }

                const aggregated = aggregateNextOption(value, index);

                if (!aggregated) break;
            }
        }

        aggregateLastestLongWord();

        if (namedOptionInitialized) {
            aggregateNextNamedOption(content.length);
        } else if (longTextTagsState) aggregateLongTextTag();

        if (choices && config.resolveCommandOptionsChoices !== null) {
            YunaParserOptionsChoicesResolver(commandMetadata, argsResult, config);
        }

        config.logResult && logResult(this, argsResult);

        return argsResult;
    };
};
