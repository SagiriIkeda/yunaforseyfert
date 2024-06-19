import { ApplicationCommandOptionType } from "discord-api-types/v10";
import type { Command, Message, SubCommand } from "seyfert";
import type { HandleCommand } from "seyfert/lib/commands/handle";
import { once } from "../../lib/utils";
import type { ArgsResult } from "../../things";
import { YunaParserOptionsChoicesResolver } from "./choicesResolver";
import {
    type CommandOptionWithType,
    RemoveFromCheckNextChar,
    RemoveLongCharEscapeMode,
    RemoveNamedEscapeMode,
    type YunaParserCreateOptions,
    createConfig,
    createRegexes,
    getYunaMetaDataFromCommand,
} from "./createConfig";

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

const sanitizeBackescapes = (text: string, regx: RegExp | undefined, regexToCheckNextChar: RegExp | undefined) =>
    regx
        ? text.replace(regx, (_, backescapes, next) => {
              const { strRepresentation } = evaluateBackescapes(backescapes, next[0], regexToCheckNextChar);

              return strRepresentation + next;
          })
        : text;

const spacesRegex = /[\s\x7F\n]/;

export const YunaParser = (config: YunaParserCreateOptions = {}) => {
    config = createConfig(config);

    const globalRegexes = createRegexes(config);

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: omitting this rule the life is better
    return function (this: HandleCommand, content: string, command: Command | SubCommand, message?: Message): Record<string, string> {
        const commandMetadata = getYunaMetaDataFromCommand(command, config);

        const { iterableOptions, options, choices } = commandMetadata;

        const realConfig = commandMetadata.getConfig();

        const regexes = commandMetadata.regexes ?? globalRegexes;

        const { elementsRegex, escapeModes: __realEscapeModes } = regexes;

        let { checkNextChar } = regexes;

        const validNamedOptionSyntaxes = Object.fromEntries(realConfig.syntax?.namedOptions?.map((t) => [t, true]) ?? []);

        const { breakSearchOnConsumeAllOptions, useUniqueNamedSyntaxAtSameTime, disableLongTextTagsInLastOption } = realConfig;

        if (!iterableOptions?.length) return {};

        const localEscapeModes = { ...__realEscapeModes };

        const matches = content.matchAll(elementsRegex);

        let tagOpenWith: '"' | "'" | "`" | "-" | null = null;
        let tagOpenPosition: number | null = null;
        let actualOptionIdx = 0;
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

        const argsResult: ArgsResult = {};

        const aggregateNextOption = (value: string, start: number | null) => {
            if (start === null && unindexedRightText) {
                const savedUnindexedText = unindexedRightText;
                unindexedRightText = "";
                aggregateNextOption(savedUnindexedText, null);
            }

            const optionAtIndexName = iterableOptions[actualOptionIdx]?.name;

            if (!optionAtIndexName) return;

            const isLastOption = actualOptionIdx === iterableOptions.length - 1;

            if (isLastOption && start !== null) {
                lastestLongWord = {
                    start,
                    name: optionAtIndexName,
                    unindexedRightText,
                };
            }

            argsResult[optionAtIndexName] = unindexedRightText + value;
            unindexedRightText = "";

            actualOptionIdx++;

            lastOptionNameAdded = optionAtIndexName;

            return lastOptionNameAdded;
        };

        const aggregateUserFromMessageReference = once(() => {
            const reference = message?.referencedMessage;
            if (
                !reference ||
                (reference.author.id !== message.author.id &&
                    realConfig.useRepliedUserAsAnOption?.requirePing &&
                    message?.mentions.users[0].id !== reference.author.id)
            )
                return true;
            const option = iterableOptions[actualOptionIdx] as CommandOptionWithType | undefined;
            if (option?.type !== ApplicationCommandOptionType.User) return false;

            argsResult[option.name] = reference.author.id;
            actualOptionIdx++;
            return true;
        });

        aggregateUserFromMessageReference();

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

        const aggregateTagLongText = (tag: string, start: number, end?: number) => {
            const value = content.slice(start, end);
            tagOpenWith = null;
            tagOpenPosition = null;
            isRecentlyClosedAnyTag = true;
            const reg = localEscapeModes[tag as keyof typeof localEscapeModes];

            aggregateNextOption(reg ? sanitizeBackescapes(value, reg, checkNextChar) : value, null);
        };

        const aggregateNextNamedOption = (end: number) => {
            if (!namedOptionInitialized) return;
            const { name, start, dotted } = namedOptionInitialized;

            const escapeModeType = dotted ? "forNamedDotted" : "forNamed";
            const escapeMode = localEscapeModes[escapeModeType];

            const value = sanitizeBackescapes(content.slice(start, end).trimStart(), escapeMode, checkNextChar).trim();

            namedOptionInitialized = null;

            if (argsResult[name] === undefined) actualOptionIdx++;

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
            if (actualOptionIdx >= iterableOptions.length && breakSearchOnConsumeAllOptions) break;

            const _isRecentlyCosedAnyTag = isRecentlyClosedAnyTag;
            isRecentlyClosedAnyTag = false;

            const { index = 0, groups } = match;

            const { tag, value, backescape, named } = groups ?? {};

            if (named && !tagOpenWith) {
                const { hyphens, hyphensname, dots, dotsname } = groups ?? {};

                const [, , backescapes] = match;

                const tagName = hyphensname ?? dotsname;

                const zeroTagUsed = (hyphens ?? dots)[0] as "-" | ":";

                const isValidTag = validNamedOptionSyntaxes[hyphens ?? dots] === true;

                if (isValidTag && !namedOptionTagUsed && realConfig.useUniqueNamedSyntaxAtSameTime) {
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
                const isDisabledLongTextTagsInLastOption = disableLongTextTagsInLastOption && actualOptionIdx >= iterableOptions.length - 1;

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
                const isDisabledLongTextTagsInLastOption = disableLongTextTagsInLastOption && actualOptionIdx >= iterableOptions.length - 1;
                const isInvalidTag = InvalidTagsToBeLong.has(tag);

                if (isEscapingNext) {
                    isEscapingNext = false;
                    if (!tagOpenWith) {
                        aggregateUnindexedText(index, tag, "/", undefined, undefined, _isRecentlyCosedAnyTag);
                    }
                } else if (isInvalidTag || isDisabledLongTextTagsInLastOption) {
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
        } else if (tagOpenPosition && tagOpenWith) aggregateTagLongText(tagOpenWith, tagOpenPosition);

        if (choices && realConfig.resolveCommandOptionsChoices !== null) {
            YunaParserOptionsChoicesResolver(commandMetadata, argsResult, realConfig);
        }

        aggregateUserFromMessageReference();

        realConfig.logResult &&
            this.client.logger.debug({
                argsResult: argsResult,
            });

        return argsResult;
    };
};
