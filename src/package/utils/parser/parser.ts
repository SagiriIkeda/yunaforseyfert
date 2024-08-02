import type { Command, Message, SubCommand } from "seyfert";
import type { CommandOptionWithType, HandleCommand } from "seyfert/lib/commands/handle";
import { ApplicationCommandOptionType } from "seyfert/lib/types";
import type { ExtendedOption } from "../../seyfert";
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
const codeBlockLangRegex = /^([^\s]+)\n/;

const flagNextSymbolBackEscapesRegex = /^(\\+)([\=\:])/;
const flagNextSymbolRegex = /[\=\:]/;

const spacesRegex = /[\s\x7F\n]/;

const codeBlockQuote = "`";

export const YunaParser = (config: YunaParserCreateOptions = {}) => {
    const globalConfig = createConfig(config);
    const globalRegexes = createRegexes(globalConfig);

    const globalVns = YunaParserCommandMetaData.getValidNamedOptionSyntaxes(globalConfig);

    const logResult = (self: HandleCommand, argsResult: ArgsResult) =>
        self.client.logger.debug("[Yuna.parser]", {
            argsResult,
        });

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: omitting this rule the life is better
    return function (this: HandleCommand, content: string, command: Command | SubCommand, message?: Message): Record<string, string> {
        const commandMetadata = YunaParserCommandMetaData.from(command);

        const { iterableOptions, flagOptions, options, choices } = commandMetadata;

        if (!options.size) return {};

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

        if (aggregateUserFromMessageReference && actualIterableOptionsIdx >= options.size) {
            config.logResult && logResult(this, argsResult);
            return argsResult;
        }

        const regexes = commandMetadata.regexes ?? globalRegexes;

        const { elementsRegex, escapeModes: __realEscapeModes } = regexes;

        let { checkNextChar } = regexes;

        const validNamedOptionSyntaxes = commandMetadata.vns ?? globalVns;

        const {
            breakSearchOnConsumeAllOptions,
            useUniqueNamedSyntaxAtSameTime,
            disableLongTextTagsInLastOption,
            useCodeBlockLangAsAnOption,
            useNamedWithSingleValue,
        } = config;

        const localEscapeModes = { ...__realEscapeModes };

        const matches = content.matchAll(elementsRegex);

        interface LongTextTagsState {
            quote: ValidLongTextTags;
            /** start position */
            start: number;
            /** position with more left quotes */
            toStart: number;
            toEnd?: number;
            end?: number;
        }

        interface NamedOptionState {
            name: string;
            start: number;
            dotted: boolean;
            optionData?: ExtendedOption;
        }

        let longTextTagsState: LongTextTagsState | null = null;

        let isEscapingNext = false;
        let unindexedRightText = "";

        let namedOptionTagUsed: string | undefined;

        let namedOptionState: NamedOptionState | null = null;

        let lastestLongWord: { start: number; name: string; unindexedRightText: string } | undefined;

        let lastOptionNameAdded: string | undefined;
        let isRecentlyClosedAnyTag = false;

        let isAlreadyLatestLongWordAggregated = false;

        const hasBackescapes = backescapesRegex.test(content);

        const sanitizeBackescapes = (text: string, regx: RegExp | undefined, regexToCheckNextChar: RegExp | undefined) =>
            hasBackescapes && regx
                ? text.replace(regx, (_, backescapes, next) => {
                      const { strRepresentation } = evaluateBackescapes(backescapes, next[0], regexToCheckNextChar);

                      return strRepresentation + next;
                  })
                : text;

        const incNamedOptionsCount = (name: string) => {
            if (argsResult[name] === undefined && options.has(name)) {
                if (flagOptions.has(name)) actualFlagOptionsIdx++;
                else actualIterableOptionsIdx++;
            }
        };

        const aggregateNextOption = (value: string, start: number | null) => {
            if (
                namedOptionState &&
                ((useNamedWithSingleValue && namedOptionState?.optionData?.useNamedWithSingleValue !== false) ||
                    namedOptionState.optionData?.useNamedWithSingleValue)
            ) {
                const { name } = namedOptionState;

                namedOptionState = null;

                argsResult[name] = value;

                incNamedOptionsCount(name);

                lastOptionNameAdded = name;
                return name;
            }

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

            isAlreadyLatestLongWordAggregated = true;

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
            if (namedOptionState) return;

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

        const aggregateNextNamedOption = (end?: number) => {
            if (!namedOptionState) return;
            const { name, start, dotted } = namedOptionState;

            const escapeModeType = dotted ? "forNamedDotted" : "forNamed";
            const escapeMode = localEscapeModes[escapeModeType];

            let symbolEqualRightValue = "";

            let contentSlice = content.slice(start, end);

            if (dotted === false) {
                contentSlice = contentSlice.replace(flagNextSymbolBackEscapesRegex, (_, backescapes, symbol) => {
                    const { strRepresentation } = evaluateBackescapes(backescapes, symbol, flagNextSymbolRegex, false);
                    symbolEqualRightValue = `${strRepresentation}${symbol}`;
                    return "";
                });
            }

            const value = symbolEqualRightValue + sanitizeBackescapes(contentSlice, escapeMode, checkNextChar).trim();

            namedOptionState = null;

            incNamedOptionsCount(name);

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

            const { tag, value, backescape, named, lnb } = groups ?? {};

            if (named && longTextTagsState === null) {
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

                namedOptionState = {
                    name: tagName,
                    start: index + named.length,
                    dotted: dotsname !== undefined,
                    optionData: options.get(tagName),
                };

                continue;
            }

            const isInNamedSingleValueMode =
                namedOptionState &&
                ((useNamedWithSingleValue && namedOptionState?.optionData?.useNamedWithSingleValue !== false) ||
                    namedOptionState?.optionData?.useNamedWithSingleValue);

            if (isInNamedSingleValueMode && lnb && longTextTagsState === null && !lastestLongWord) {
                aggregateNextNamedOption(namedOptionState!.start);
                continue;
            }

            if (lastestLongWord || (namedOptionState && !isInNamedSingleValueMode)) continue;

            if (backescape) {
                const isDisabledLongTextTagsInLastOption =
                    disableLongTextTagsInLastOption && namedOptionState === null && actualIterableOptionsIdx >= iterableOptions.length - 1;

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
                type DisableLongTextTagsInLastOptionObject = Exclude<
                    YunaParserCreateOptions["disableLongTextTagsInLastOption"],
                    boolean | undefined
                >;

                if (isEscapingNext) {
                    isEscapingNext = false;
                    if (longTextTagsState === null) {
                        aggregateUnindexedText(index, tag, "/", undefined, undefined, _isRecentlyCosedAnyTag);
                    }
                    // isDisabledLongTextTagsInLastOption
                } else if (
                    namedOptionState === null &&
                    longTextTagsState === null &&
                    disableLongTextTagsInLastOption &&
                    actualIterableOptionsIdx >= iterableOptions.length - 1 &&
                    ((disableLongTextTagsInLastOption as DisableLongTextTagsInLastOptionObject).excludeCodeBlocks
                        ? !(tag === codeBlockQuote && content[index + 1] === codeBlockQuote && content[index + 2] === codeBlockQuote)
                        : true)
                ) {
                    aggregateNextOption(tag, index);
                    continue;
                } else if (InvalidTagsToBeLong.has(tag)) {
                    aggregateUnindexedText(index, tag, "", undefined, undefined, _isRecentlyCosedAnyTag);
                    continue;
                } else if (longTextTagsState === null) {
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

                        const isPossiblyEndSequentially = nextCharIsSameQuote && longTextTagsState.toEnd === undefined;

                        if (isPossiblyEndSequentially) {
                            longTextTagsState.toEnd = index;
                            longTextTagsState.end = index;
                            continue;
                        }

                        if (longTextTagsState.end !== undefined && longTextTagsState.end + 1 === index && nextCharIsSameQuote) {
                            longTextTagsState.end++;
                        } else {
                            const isCodeBlock =
                                longTextTagsState.quote === "`" && longTextTagsState.toStart - longTextTagsState.start === 2;

                            const endPosition = longTextTagsState.toEnd ?? index;

                            if (!isCodeBlock) {
                                aggregateLongTextTag(endPosition);
                            } else if (
                                longTextTagsState.toEnd !== undefined &&
                                longTextTagsState.end !== undefined &&
                                index - longTextTagsState.toEnd >= 2
                            ) {
                                const codeBlockContent = content.slice(longTextTagsState.toStart, endPosition);

                                const codeBlockLangMatch = codeBlockContent.match(codeBlockLangRegex);

                                const canAddLangOption = useCodeBlockLangAsAnOption && !namedOptionState;

                                if (codeBlockLangMatch) {
                                    canAddLangOption && aggregateNextOption(codeBlockLangMatch[1], longTextTagsState.toStart);
                                    longTextTagsState.toStart += codeBlockLangMatch[0].length;
                                } else {
                                    canAddLangOption && actualIterableOptionsIdx++;
                                }

                                const startsWithLineBreak = content[longTextTagsState.toStart] === "\n";
                                const endWithLineBreak = content[longTextTagsState.toEnd - 1] === "\n";

                                if (startsWithLineBreak) longTextTagsState.toStart++;
                                if (endWithLineBreak) longTextTagsState.toEnd--;

                                aggregateLongTextTag(longTextTagsState.toEnd ?? index);
                            }
                        }
                    }
                }

                continue;
            }

            if (isInNamedSingleValueMode && isAlreadyLatestLongWordAggregated) continue;

            if (value && longTextTagsState === null) {
                const placeIsForLeft = !(_isRecentlyCosedAnyTag || unindexedRightText || spacesRegex.test(content[index - 1]));

                if (placeIsForLeft && lastOptionNameAdded) {
                    argsResult[lastOptionNameAdded] += value;
                    continue;
                }

                aggregateNextOption(value, index);
            }
        }

        aggregateLastestLongWord();
        aggregateNextNamedOption();
        aggregateLongTextTag();

        if (choices && config.resolveCommandOptionsChoices !== null) {
            YunaParserOptionsChoicesResolver(commandMetadata, argsResult, config);
        }

        config.logResult && logResult(this, argsResult);

        return argsResult;
    };
};
