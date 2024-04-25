import type { SubCommand, Command } from "seyfert";
import { RemoveNamedEscapeMode, createRegexs as createRegexes, getYunaMetaDataFromCommand, type YunaParserCreateOptions, createConfig } from "./createConfig";


const InvalidTagsToBeLong = new Set(["-", ":"]);

// /["'`\:\-]/

const evaluateBackescapes = (backspaces: string, nextChar: string, regexToCheckNextChar?: RegExp, isDisabledLongTextTagsInLastOption?: boolean) => {

    const isJustPair = backspaces.length % 2 === 0;

    const isPossiblyEscapingNext = !isJustPair && ((/["'`]/.test(nextChar)) && isDisabledLongTextTagsInLastOption) ? false :  regexToCheckNextChar?.test(nextChar);

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

    config = createConfig(config);

    const globalRegexes = createRegexes(config);

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: omitting this rule the life is better
    return (content: string, command: Command | SubCommand): Record<string, string> => {

        const { options, depth: skipElementsCount, config: commandConfig, regexes: commandRegexes } = getYunaMetaDataFromCommand(config, command);

        const elementsRegex = commandRegexes?.elementsRegex ?? globalRegexes.elementsRegex;
        const realEscapeModes = commandRegexes?.escapeModes ?? globalRegexes.escapeModes;
        const checkNextChar = commandRegexes?.checkNextChar ?? globalRegexes.checkNextChar;

        const { breakSearchOnConsumeAllOptions, useUniqueNamedSyntaxAtSameTime, disableLongTextTagsInLastOption } = commandConfig ?? config;

        if (!options) return {};

        const localEscapeModes = { ...realEscapeModes };

        const matches = content.matchAll(elementsRegex);

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

            result[name] = (unindexedRightText + sanitizeBackescapes(content.slice(start, end), localEscapeModes.All) + postText).trim();
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
            const reg = localEscapeModes[tag as keyof typeof localEscapeModes];

            aggregateNextOption(reg ? sanitizeBackescapes(value, reg) : value, null);
        };

        const aggregateNextNamedOption = (end: number) => {
            if (!namedOptionInitialized) return;
            const { name, start, dotted } = namedOptionInitialized;

            const value = sanitizeBackescapes(content.slice(start, end).trimStart(), localEscapeModes[dotted ? "forNamedDotted" : "forNamed"]);

            namedOptionInitialized = null;

            if (result[name] === undefined) actualOptionIdx++;

            result[name] = value;

            lastOptionNameAdded = name;
            return name;
        };

        for (const match of matches) {
            if (actualOptionIdx >= options.length && breakSearchOnConsumeAllOptions) break;
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

                if (!namedOptionTagUsed) {
                    namedOptionTagUsed = tagUsed;
                    RemoveNamedEscapeMode(localEscapeModes, tagUsed === "-" ? ":" : "\\-");
                } else if ((useUniqueNamedSyntaxAtSameTime && namedOptionTagUsed !== tagUsed)) {
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
                const isDisabledLongTextTagsInLastOption = disableLongTextTagsInLastOption && actualOptionIdx >= options.length -1;

                const { length } = backescape;

                const nextChar = content[index + length];

                const { isPossiblyEscapingNext, strRepresentation } = evaluateBackescapes(backescape, nextChar, checkNextChar, isDisabledLongTextTagsInLastOption);

                if (isPossiblyEscapingNext) isEscapingNext = true;

                strRepresentation && aggregateUnindexedText(index, strRepresentation, "", backescape, undefined, _isRecentlyCosedAnyTag);
                continue;
            }

            if (tag) {
                const isDisabledLongTextTagsInLastOption = disableLongTextTagsInLastOption && actualOptionIdx >= options.length - 1;

                if (isEscapingNext) {
                    isEscapingNext = false;
                    if (!tagOpenWith) {
                        aggregateUnindexedText(index, tag, "/", undefined, undefined, _isRecentlyCosedAnyTag);
                    }
                } else if (isDisabledLongTextTagsInLastOption || InvalidTagsToBeLong.has(tag)) {
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
