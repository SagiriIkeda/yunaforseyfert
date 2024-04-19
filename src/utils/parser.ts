import { Command, CommandOption, SubCommand } from "seyfert";
import { ApplicationCommandOptionType } from "discord-api-types/v10";

const key = Symbol("YunaParserMetaData")

const InvalidOptionType = new Set([
    ApplicationCommandOptionType.Attachment,
    ApplicationCommandOptionType.Subcommand,
    ApplicationCommandOptionType.SubcommandGroup
])

const InvalidTagsToBeLong = new Set([
    "-", ":"
])


const evaluateBackescapes = (backspaces: string, nextChar: string) => {

    const isJustPair = backspaces.length % 2 === 0;

    const isPossiblyEscapingNext = !isJustPair && /["'`\:\-]/.test(nextChar)

    const strRepresentation = "\\".repeat(Math.floor(backspaces.length / 2)) + (!isJustPair && !isPossiblyEscapingNext ? "\\" : "")

    return { isPossiblyEscapingNext, strRepresentation }
}

const sanitizeBackescapes = (text: string, regx: RegExp) => text.replace(regx, (_, backescapes, next) => {

    const { strRepresentation } = evaluateBackescapes(backescapes, next[0]);

    return strRepresentation + next
})

const EscapeMode = {
    '"': /(\\+)(["\s])/g,
    "'": /(\\+)(['\s])/g,
    "`": /(\\+)([`\s])/g,
    "forNamed": /(\\+)([\:\s\-])/g,
    "forNamedDotted": /(\\+)([\:\s\-\/])/g,
    "All": /(\\+)([`"':\s\-])/g,
} satisfies Record<string, RegExp | undefined>;

const spacesRegex = /[\s\x7F\n]/;

interface CommandYunaData {
    options: CommandOption[],
    depth: number
}

const getYunaMetaDataFromCommand = (command: (Command | SubCommand) & { [key]?: CommandYunaData }) => {

    const InCache = command[key]
    if (InCache) return InCache

    return command[key] = {
        options: command.options?.filter((option) => "type" in option && !InvalidOptionType.has(option.type)) as CommandOption[],
        depth: (command instanceof SubCommand) ? (command.group ? 3 : 2) : 1,
    }

}

// const ElementsRegex = /(?<named>(\\*)(?:-{1,2}([a-zA-Z_\d]+)|([a-zA-Z_\d]+):(?!\/\/[^\s\x7F])))|(?<tag>["'`:-])|(?<value>[^\s\x7F"'`\\]+)|(?<backescape>\\+)/g;
const ElementsRegex = /(?<named>(\\*)(?:(-{1,2})([a-zA-Z_\d]+)|([a-zA-Z_\d]+)(:)(?!\/\/[^\s\x7F])))|(?<tag>["'`:-])|(?<value>[^\s\x7F"'`\\]+)|(?<backescape>\\+)/g;


interface YunaParserCreateOptions {
    /**
     * this only show console.log with the options parsed. 
     * @default false */
    debug: boolean
}

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

export const YunaParser = ({ debug = false }: YunaParserCreateOptions) => {

    return (content: string, command: Command | SubCommand): Record<string, string> => {

        const { options, depth: skipElementsCount } = getYunaMetaDataFromCommand(command)

        if (!options) return {}

        const matches = content.matchAll(ElementsRegex)

        let tagOpenWith: '"' | "'" | "`" | "-" | null = null
        let tagOpenPosition: number | null = null;
        let actualOptionIdx: number = 0
        let isEscapingNext = false
        let unindexedRightText = "";

        let namedOptionTagUsed: string | undefined;

        let namedOptionInitialized: {
            name: string,
            start: number,
            dotted: boolean
        } | null = null;

        let lastestLongWord: { start: number, name: string, unindexedRightText: string } | undefined;

        let lastOptionNameAdded: string | undefined;
        let isRecentlyClosedAnyTag = false;
        let matchIdx = 0;


        const result: Record<string, string> = {}

        const aggregateNextOption = (value: string, start: number | null) => {

            if (start === null && unindexedRightText) {
                const savedUnindexedText = unindexedRightText
                unindexedRightText = "";
                aggregateNextOption(savedUnindexedText, null)
            }

            const optionAtIndexName = options[actualOptionIdx]?.name;

            if (!optionAtIndexName) return;

            const isLastOption = (actualOptionIdx === options.length - 1);

            if (isLastOption && start) {
                lastestLongWord = {
                    start,
                    name: optionAtIndexName,
                    unindexedRightText,
                }
            }
            
            result[optionAtIndexName] = unindexedRightText + value;
            unindexedRightText = "";

            actualOptionIdx++

            return lastOptionNameAdded = optionAtIndexName;
        }

        const aggregateLastestLongWord = (end: number = content.length, postText = "") => {
            if(!lastestLongWord) return

            const {name, start, unindexedRightText} = lastestLongWord;

            lastestLongWord = undefined;

            result[name] = unindexedRightText + sanitizeBackescapes(content.slice(start, end), EscapeMode["All"]) + postText;
            return 
        }

        const aggregateUnindexedText = (textPosition: number, text: string, precedentText = "", realText = text, enableRight = true, isRecentlyClosedAnyTag = false) => {

            if (namedOptionInitialized) return;

            const backPosition = textPosition - (precedentText.length + 1)
            const nextPosition = textPosition + realText.length

            const backChar = content[backPosition]
            const nextChar = content[nextPosition]

            if (!unindexedRightText && lastOptionNameAdded && !isRecentlyClosedAnyTag && backChar && !(spacesRegex.test(backChar)) /* placeIsForLeft */) {
                result[lastOptionNameAdded] += text
                return;
            } else if (enableRight && nextChar && !(spacesRegex.test(nextChar)) /* placeIsForRight */) {
                unindexedRightText += text;
                return
            }

            aggregateNextOption(text, textPosition)

        }

        const aggregateTagLongText = (tag: string, start: number, end?: number) => {
            const value = content.slice(start, end)
            tagOpenWith = null
            tagOpenPosition = null
            isRecentlyClosedAnyTag = true;
            const reg = EscapeMode[tag as keyof typeof EscapeMode]

            aggregateNextOption(reg ? sanitizeBackescapes(value, reg) : value, null)
        }

        const aggregateNextNamedOption = (end: number) => {

            if (!namedOptionInitialized) return;
            const { name, start, dotted } = namedOptionInitialized;

            const value = sanitizeBackescapes(content.slice(start, end).trimStart(), EscapeMode[dotted ? "forNamedDotted" : "forNamed"])

            namedOptionInitialized = null;

            if (result[name] === undefined) actualOptionIdx++

            result[name] = value;

            lastOptionNameAdded = name;
            return name;

        }

        for (const match of matches) {
            if ((matchIdx++) < skipElementsCount) continue;

            const _isRecentlyCosedAnyTag = isRecentlyClosedAnyTag;
            isRecentlyClosedAnyTag = false;

            const { index = 0, groups } = match

            const { tag, value, backescape, named } = groups ?? {}

            if (named && !tagOpenWith) {
                const [, , backescapes, __ ,namefor_, nameforDotted, dots] = match;

                const tagName = namefor_ ?? nameforDotted;

                const tagUsed = __ ?? dots;

                namedOptionTagUsed ??= tagUsed;
                
                if(namedOptionTagUsed !== tagUsed) {
                    aggregateUnindexedText(index, named, undefined, named, undefined, _isRecentlyCosedAnyTag);
                    continue;
                }

                let backescapesStrRepresentation = "";
                
                if (backescapes) {
                    const nextChar = named[backescapes.length];

                    const { isPossiblyEscapingNext, strRepresentation } = evaluateBackescapes(backescapes, nextChar)
                    backescapesStrRepresentation = strRepresentation;

                    if (namefor_ && isPossiblyEscapingNext) {
                        aggregateUnindexedText(index, strRepresentation + (named.slice(backescapes.length)), undefined, named, undefined, _isRecentlyCosedAnyTag);
                        continue
                    } else if (!lastestLongWord && strRepresentation) aggregateUnindexedText(index, strRepresentation, undefined, backescapes, false, _isRecentlyCosedAnyTag)

                }

                aggregateNextNamedOption(index - 1)

                if(lastestLongWord) aggregateLastestLongWord(index, backescapesStrRepresentation);

                namedOptionInitialized = {
                    name: tagName,
                    start: index + named.length,
                    dotted: nameforDotted !== undefined,
                }

                continue;
            }

            if (lastestLongWord || namedOptionInitialized) continue;

            if (backescape) {
                const { length } = backescape

                const nextChar = content[index + length]

                const { isPossiblyEscapingNext, strRepresentation } = evaluateBackescapes(backescape, nextChar)

                if (isPossiblyEscapingNext) isEscapingNext = true

                strRepresentation && aggregateUnindexedText(index, strRepresentation, "", backescape, undefined, _isRecentlyCosedAnyTag)
                continue
            }

            if (tag) {

                if (isEscapingNext) {
                    isEscapingNext = false
                    if (!tagOpenWith) {
                        aggregateUnindexedText(index, tag, "/", undefined, undefined, _isRecentlyCosedAnyTag)
                    }
                }
                else if (InvalidTagsToBeLong.has(tag)) {
                    aggregateUnindexedText(index, tag, "", undefined, undefined, _isRecentlyCosedAnyTag)
                    continue
                } else if (!tagOpenWith) {
                    tagOpenWith = tag as unknown as typeof tagOpenWith
                    tagOpenPosition = index + 1
                } else if (tagOpenWith === tag && tagOpenPosition) {
                    aggregateTagLongText(tag, tagOpenPosition, index)
                }

                continue
            }

            if (value && tagOpenWith === null) {

                const placeIsForLeft = (matchIdx > skipElementsCount) && !_isRecentlyCosedAnyTag && !unindexedRightText && !(spacesRegex.test(content[index - 1]))

                if (placeIsForLeft && lastOptionNameAdded) {
                    result[lastOptionNameAdded] += value;
                    continue;
                }

                const aggregated = aggregateNextOption(value, index)

                if (!aggregated) break

            }

        }


        aggregateLastestLongWord();
        
        if (namedOptionInitialized) { aggregateNextNamedOption(content.length) }
        else if (tagOpenPosition && tagOpenWith) aggregateTagLongText(tagOpenWith, tagOpenPosition);

        debug && console.log(result)

        return result
    }
}